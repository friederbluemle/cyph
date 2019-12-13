import {BehaviorSubject, Observable} from 'rxjs';
import {IHandshakeState} from '../crypto/castle/ihandshake-state';
import {IResolvable} from '../iresolvable';
import {MaybePromise} from '../maybe-promise-type';
import {
	ISessionMessage,
	ISessionMessageData as ISessionMessageDataInternal
} from '../proto/types';
import {
	CastleEvents,
	ISessionMessageAdditionalData,
	ISessionMessageData,
	ProFeatures
} from '../session';

/**
 * Encapsulates an end-to-end encrypted communication session.
 * This is the entire non-UI representation of a cyph.
 */
export interface ISessionService {
	/** API flags passed into this session. */
	readonly apiFlags: {
		disableP2P: boolean;
		modestBranding: boolean;
	};

	/** App username. Currently just an empty string. */
	readonly appUsername: Observable<string>;

	/** Resolves when this session is closed. */
	readonly closed: Promise<void>;

	/** Resolves when this session is connected. */
	readonly connected: Promise<void>;

	/** Resolves when this session 404s. */
	readonly cyphNotFound: Promise<void>;

	/** When true, blocks responding to pings. */
	readonly freezePong: BehaviorSubject<boolean>;

	/** Messaging group, if applicable. */
	group?: ISessionService[];

	/** Resolves when first batch of incoming messages have been processed. */
	readonly initialMessagesProcessed: IResolvable<void>;

	/** Local username (e.g. "me"). */
	readonly localUsername: Observable<string>;

	/** @see ProFeatures */
	readonly proFeatures: ProFeatures;

	/** Resolves when service is ready. */
	readonly ready: Promise<void>;

	/** Remote username (e.g. "friend" or "alice"). */
	readonly remoteUsername: BehaviorSubject<string>;

	/** State of the cyph (referenced by UI). */
	readonly state: {
		cyphID: BehaviorSubject<string>;
		isAlice: BehaviorSubject<boolean>;
		isAlive: BehaviorSubject<boolean>;
		sharedSecret: BehaviorSubject<string | undefined>;
		startingNewCyph: BehaviorSubject<boolean | undefined>;
		wasInitiatedByAPI: BehaviorSubject<boolean>;
	};

	/** Session key for misc stuff like locking. */
	readonly symmetricKey: BehaviorSubject<Uint8Array | undefined>;

	/** Castle event handler called by Castle.Transport. */
	castleHandler (
		event: CastleEvents,
		data?:
			| Uint8Array
			| {
					author: Observable<string>;
					initial: boolean;
					instanceID: string;
					plaintext: Uint8Array;
					timestamp: number;
			  }
	) : Promise<void>;

	/** This kills the cyph. */
	close () : void;

	/** Cleans things up and tears down event handlers. */
	destroy () : void;

	/** @see IHandshakeState */
	handshakeState () : Promise<IHandshakeState>;

	/** Initializes service. */
	init (channelID: string, channelSubID?: string, userID?: string) : void;

	/** @see ChannelService.lock */
	lock<T> (
		f: (o: {
			reason?: string;
			stillOwner: BehaviorSubject<boolean>;
		}) => Promise<T>,
		reason?: string
	) : Promise<T>;

	/** Remove event listener. */
	off<T> (event: string, handler?: (data: T) => void) : void;

	/** Add event listener. */
	on<T> (event: string, handler: (data: T) => void) : void;

	/** Returns first occurrence of event. */
	one<T> (event: string) : Promise<T>;

	/** Converts an ISessionMessageDataInternal into an ISessionMessageData. */
	processMessageData (
		data: ISessionMessageDataInternal,
		initial?: boolean
	) : Promise<ISessionMessageData>;

	/** Send at least one message through the session. */
	send (
		...messages: [
			string,

			(
				| ISessionMessageAdditionalData
				| ((
						timestamp: number
				  ) => MaybePromise<ISessionMessageAdditionalData>)
			)
		][]
	) : Promise<{
		confirmPromise: Promise<void>;
		newMessages: (ISessionMessage & {data: ISessionMessageData})[];
	}>;

	/** Creates and returns a new instance. */
	spawn () : ISessionService;

	/** Trigger event, passing in optional data. */
	trigger (event: string, data?: any) : Promise<void>;

	/** Resolves when other user is online. */
	yt () : Promise<void>;
}
