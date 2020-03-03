import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Router} from '@angular/router';
import {map} from 'rxjs/operators';
import {
	NewContactTypes,
	UserPresence,
	userPresenceSelectOptions
} from '../../account';
import {BaseProvider} from '../../base-provider';
import {AccountUserTypes} from '../../proto';
import {AccountAppointmentsService} from '../../services/account-appointments.service';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountInviteService} from '../../services/account-invite.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackByValue} from '../../track-by/track-by-value';
import {urlToSafeStyle} from '../../util/safe-values';
import {getDateTimeString} from '../../util/time';

/**
 * Angular component for account home UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-menu',
	styleUrls: ['./account-menu.component.scss'],
	templateUrl: './account-menu.component.html'
})
export class AccountMenuComponent extends BaseProvider {
	/** @see AccountUserTypes */
	public readonly accountUserTypes = AccountUserTypes;

	/** @see getDateTimeSting */
	public readonly getDateTimeString = getDateTimeString;

	/** @see AccountService.menuExpanded */
	public readonly menuExpanded = this.accountService.menuExpanded.pipe(
		map(menuExpanded => this.sidenav || menuExpanded)
	);

	/** @see NewContactTypes */
	public readonly newContactTypes = NewContactTypes;

	/** If true, is inside a sidenav. */
	@Input() public sidenav: boolean = false;

	/** @see UserPresence */
	public readonly statuses = userPresenceSelectOptions;

	/** @see trackByValue */
	public readonly trackByValue = trackByValue;

	/** @see urlToSafeStyle */
	public readonly urlToSafeStyle = urlToSafeStyle;

	/** @see UserPresence */
	public readonly userPresence = UserPresence;

	/** Handler for button clicks. */
	public click () : void {
		this.accountService.toggleMobileMenu(false);
	}

	/** @see AccountAuthService.lock */
	public async lock () : Promise<void> {
		this.click();

		if (
			!(await this.dialogService.confirm({
				content: this.stringsService.lockPrompt,
				title: this.stringsService.lockTitle
			}))
		) {
			return;
		}

		await this.accountAuthService.lock();
	}

	/** @see AccountAuthService.logout */
	public async logout () : Promise<void> {
		this.click();

		if (
			!(await this.dialogService.confirm({
				content: this.stringsService.logoutPrompt,
				title: this.stringsService.logoutTitle
			}))
		) {
			return;
		}

		await this.router.navigate(['logout']);
	}

	constructor (
		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAppointmentsService */
		public readonly accountAppointmentsService: AccountAppointmentsService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see AccountInviteService */
		public readonly accountInviteService: AccountInviteService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
