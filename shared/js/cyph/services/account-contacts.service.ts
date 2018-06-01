import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, Observable} from 'rxjs';
import {map, mergeMap, skip, take} from 'rxjs/operators';
import {IContactListItem, User} from '../account';
import {StringProto} from '../proto';
import {filterDuplicatesOperator, filterUndefined} from '../util/filter';
import {toBehaviorSubject} from '../util/flatten-observable';
import {normalize, normalizeArray} from '../util/formatting';
import {getOrSetDefault, getOrSetDefaultAsync} from '../util/get-or-set-default';
import {uuid} from '../util/uuid';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';


/**
 * Account contacts service.
 */
@Injectable()
export class AccountContactsService {
	/** @ignore */
	private readonly contactIdCache: Map<string, Map<string, string>>	=
		new Map<string, Map<string, string>>()
	;

	/** List of contacts for current user, sorted alphabetically by username. */
	public readonly contactList: Observable<(IContactListItem|User)[]>	= toBehaviorSubject(
		this.accountDatabaseService.watchListKeys('contactUsernames').pipe(
			mergeMap(async keys =>
				(await Promise.all(
					(await Promise.all(
						keys.map(async key => ({
							key,
							username: await this.accountDatabaseService.getItem(
								`contactUsernames/${key}`,
								StringProto
							)
						}))
					)).map(async ({key, username}) => ({
						id: await this.getContactID(username),
						key,
						username
					}))
				)).
					filter(({id, key}) => id === key).
					map(({username}) => username).
					sort()
			),
			filterDuplicatesOperator(),
			map(usernames => usernames.map(username => ({
				user: this.accountUserLookupService.getUser(username),
				username
			})))
		),
		[]
	);

	/** Fully loads contact list. */
	public readonly fullyLoadContactList	= memoize(
		(contactList: Observable<(IContactListItem|User)[]>) : Observable<User[]> =>
			toBehaviorSubject(
				contactList.pipe(mergeMap(async contacts =>
					filterUndefined(await Promise.all(
						contacts.map(async contact =>
							contact instanceof User ? contact : contact.user
						)
					))
				)),
				[]
			)
	);

	/** Indicates whether spinner should be displayed. */
	public readonly showSpinner: BehaviorSubject<boolean>	= new BehaviorSubject(true);

	/**
	 * Adds contact.
	 * @returns Contact ID.
	 */
	public async addContact (username: string|string[]) : Promise<string> {
		if (username instanceof Array) {
			await Promise.all(username.map(async groupMember => this.addContact(groupMember)));
			return this.getContactID(username);
		}

		const id	= await this.getContactID(username);
		const url	= `contactUsernames/${id}`;

		if (!(await this.accountDatabaseService.hasItem(url))) {
			await this.accountDatabaseService.setItem(url, StringProto, normalize(username));
		}

		return id;
	}

	/**
	 * Gets Castle session ID based on username.
	 * Note: string array parameter is temporary/deprecated.
	 */
	public async getCastleSessionID (username: string|string[]) : Promise<string> {
		const currentUserUsername	=
			(await this.accountDatabaseService.getCurrentUser()).user.username
		;

		if (username instanceof Array) {
			return this.potassiumService.toHex(await this.potassiumService.hash.hash(
				normalizeArray([currentUserUsername, ...username]).join(' ')
			));
		}

		const [userA, userB]		= normalizeArray([currentUserUsername, username]);

		return this.databaseService.getOrSetDefault(
			`castleSessionIDs/${userA}/${userB}`,
			StringProto,
			() => uuid(true)
		);
	}

	/** Gets contact ID based on username. */
	public async getContactID (username: string|string[]) : Promise<string> {
		const currentUserUsername	=
			(await this.accountDatabaseService.getCurrentUser()).user.username
		;

		return getOrSetDefaultAsync(
			getOrSetDefault(
				this.contactIdCache,
				currentUserUsername,
				() => new Map<string, string>()
			),
			username instanceof Array ? username.join(' ') : username,
			async () => this.potassiumService.toHex(await this.potassiumService.hash.hash(
				normalizeArray([currentUserUsername].concat(username)).join(' ')
			))
		);
	}

	/** Gets contact username based on ID. */
	public async getContactUsername (id: string) : Promise<string> {
		return this.accountDatabaseService.getItem(`contactUsernames/${id}`, StringProto);
	}

	/** Indicates whether the user is already a contact. */
	public async isContact (username: string) : Promise<boolean> {
		return this.accountDatabaseService.hasItem(
			`contactUsernames/${await this.getContactID(username)}`
		);
	}

	/** Removes contact. */
	public async removeContact (username: string) : Promise<void> {
		await this.accountDatabaseService.removeItem(
			`contactUsernames/${await this.getContactID(username)}`
		);
	}

	/** Adds or removes contact. */
	public async toggleContact (username: string) : Promise<void> {
		if (await this.isContact(username)) {
			await this.removeContact(username);
		}
		else {
			await this.addContact(username);
		}
	}

	/** Watches whether the user is a contact. */
	public watchIfContact (username: string) : Observable<boolean> {
		return this.accountDatabaseService.watchExists((async () =>
			`contactUsernames/${await this.getContactID(username)}`
		)());
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly databaseService: DatabaseService
	) {
		this.accountDatabaseService.getListKeys('contactUsernames').then(keys => {
			if (keys.length < 1) {
				this.showSpinner.next(false);
			}
		});

		this.contactList.pipe(skip(1), take(1)).toPromise().then(() => {
			this.showSpinner.next(false);
		});
	}
}
