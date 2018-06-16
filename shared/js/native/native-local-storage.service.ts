import {Injectable} from '@angular/core';
import {SecureStorage} from 'nativescript-secure-storage';
import {potassiumUtil} from './js/cyph/crypto/potassium/potassium-util';
import {LocalStorageService} from './js/cyph/services/local-storage.service';
import {parse, stringify} from './js/cyph/util/serialization';


/**
 * Provides local storage functionality for native app.
 */
@Injectable()
export class NativeLocalStorageService extends LocalStorageService {
	/** @ignore */
	private readonly keysURL: string		= 'NativeLocalStorageService-keys';

	/** @ignore */
	private readonly storage: SecureStorage	= new SecureStorage();

	/** @ignore */
	private async getKeysObject () : Promise<{[key: string]: boolean}> {
		try {
			return parse<{[key: string]: boolean}>(await this.storage.get({key: this.keysURL}));
		}
		catch {
			return {};
		}
	}

	/** @inheritDoc */
	protected async clearInternal (_WAIT_FOR_READY: boolean) : Promise<void> {
		await this.storage.set({
			key: this.keysURL,
			value: stringify({})
		});

		await this.storage.removeAll();
	}

	/** @inheritDoc */
	protected async getItemInternal (
		url: string,
		_WAIT_FOR_READY: boolean
	) : Promise<Uint8Array> {
		const value	= await this.storage.get({key: url});

		if (typeof value !== 'string') {
			throw new Error(`Item ${url} not found.`);
		}

		return potassiumUtil.fromBase64(value);
	}

	/** @inheritDoc */
	protected async getKeysInternal (_WAIT_FOR_READY: boolean) : Promise<string[]> {
		return Object.keys(await this.getKeysObject());
	}

	/** @inheritDoc */
	protected async removeItemInternal (url: string, _WAIT_FOR_READY: boolean) : Promise<void> {
		await this.storage.set({
			key: this.keysURL,
			value: stringify({
				...(await this.getKeysObject()),
				[url]: undefined
			})
		});

		await this.storage.remove({key: url});
	}

	/** @inheritDoc */
	protected async setItemInternal (
		url: string,
		value: Uint8Array,
		_WAIT_FOR_READY: boolean
	) : Promise<void> {
		await this.storage.set({
			key: url,
			value: potassiumUtil.toBase64(value)
		});

		await this.storage.set({
			key: this.keysURL,
			value: stringify({
				...(await this.getKeysObject()),
				[url]: true
			})
		});
	}

	constructor () {
		super();
	}
}
