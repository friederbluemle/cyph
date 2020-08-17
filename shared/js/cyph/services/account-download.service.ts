import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {Observable} from 'rxjs';
import {SecurityModels} from '../account';
import {BaseProvider} from '../base-provider';
import {MaybePromise} from '../maybe-promise-type';
import {
	AccountFileRecord,
	AccountFileReference,
	BinaryProto,
	IAccountFileRecord,
	IAccountFileReference
} from '../proto';
import {normalize} from '../util/formatting';
import {AccountFilesService} from './account-files.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {PotassiumService} from './crypto/potassium.service';

/**
 * Angular service for account file downloads.
 */
@Injectable()
export class AccountDownloadService extends BaseProvider {
	/** Watches whether the file is publicly shared. */
	public readonly watchIfShared = memoize(
		(downloadID: string) : Observable<boolean> =>
			this.accountDatabaseService.watchExists(
				`fileDownloads/${downloadID}`
			)
	);

	/** Checks whether the file is publicly shared. */
	public async checkIfShared (downloadID: string) : Promise<boolean> {
		return this.accountDatabaseService.hasItem(
			`fileDownloads/${downloadID}`
		);
	}

	/** Downloads file. */
	public download (
		fileReference: MaybePromise<IAccountFileRecord & IAccountFileReference>
	) : {
		file: Promise<IAccountFileRecord & IAccountFileReference>;
		progress: Observable<number>;
		result: Promise<void>;
	};
	public download (
		username: string,
		id: string
	) : {
		file: Promise<IAccountFileRecord & IAccountFileReference>;
		progress: Observable<number>;
		result: Promise<void>;
	};
	public download (
		username:
			| string
			| MaybePromise<IAccountFileRecord & IAccountFileReference>,
		id?: string
	) : {
		file: Promise<IAccountFileRecord & IAccountFileReference>;
		progress: Observable<number>;
		result: Promise<void>;
	} {
		const file =
			typeof username === 'string' && typeof id === 'string' ?
				this.getFile(username, id) :
			typeof username !== 'string' ?
				Promise.resolve(username) :
				undefined;

		if (file === undefined) {
			throw new Error('File download failure.');
		}

		return {
			...this.accountFilesService.downloadAndSave(file),
			file
		};
	}

	/** Gets file reference/metadata. */
	public async getFile (
		username: string,
		id: string
	) : Promise<IAccountFileRecord & IAccountFileReference> {
		username = normalize(username);

		const keyBytes = await this.potassiumService.secretBox.keyBytes;

		const idBytes = this.potassiumService.fromHex(id);

		const key = idBytes.slice(0, keyBytes);
		const downloadID = this.potassiumService.toHex(idBytes.slice(keyBytes));

		const reference = await this.accountDatabaseService.getItem(
			`users/${username}/fileDownloads/${downloadID}`,
			AccountFileReference,
			SecurityModels.privateSigned,
			key,
			true
		);

		const record = await this.accountDatabaseService.getItem(
			`users/${reference.owner}/fileRecords/${reference.id}`,
			AccountFileRecord,
			undefined,
			reference.key,
			true
		);

		return {...record, ...reference};
	}

	/** Revokes public file share (if applicable). */
	public async revoke (downloadID: string) : Promise<void> {
		await this.accountDatabaseService.removeItem(
			`fileDownloads/${downloadID}`
		);
	}

	/**
	 * Publicly shares file.
	 * @returns ID.
	 */
	public async share (downloadID: string) : Promise<string> {
		const [key, reference] = await Promise.all([
			this.accountDatabaseService.getOrSetDefault(
				`fileDownloadKeys/${downloadID}`,
				BinaryProto,
				async () =>
					this.potassiumService.randomBytes(
						await this.potassiumService.secretBox.keyBytes
					),
				undefined,
				undefined,
				true
			),
			this.accountDatabaseService.getItem(
				`fileReferences/${downloadID}`,
				AccountFileReference
			)
		]);

		await this.accountDatabaseService.setItem(
			`fileDownloads/${downloadID}`,
			AccountFileReference,
			reference,
			SecurityModels.privateSigned,
			key
		);

		return this.potassiumService.toHex(key) + downloadID;
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		super();
	}
}
