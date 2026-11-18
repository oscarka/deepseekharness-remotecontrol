// node_modules/.pnpm/hls.js@1.7.4/node_modules/hls.js/dist/hls.light.mjs
var isFiniteNumber = Number.isFinite || function(value) {
	return typeof value === "number" && isFinite(value);
};
var isSafeInteger = Number.isSafeInteger || function(value) {
	return typeof value === "number" && Math.abs(value) <= MAX_SAFE_INTEGER;
};
var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;
var ErrorTypes = /*#__PURE__*/ function(ErrorTypes) {
	ErrorTypes["NETWORK_ERROR"] = "networkError";
	ErrorTypes["MEDIA_ERROR"] = "mediaError";
	ErrorTypes["KEY_SYSTEM_ERROR"] = "keySystemError";
	ErrorTypes["MUX_ERROR"] = "muxError";
	ErrorTypes["OTHER_ERROR"] = "otherError";
	return ErrorTypes;
}({});
var ErrorDetails = /*#__PURE__*/ function(ErrorDetails) {
	ErrorDetails["KEY_SYSTEM_NO_KEYS"] = "keySystemNoKeys";
	ErrorDetails["KEY_SYSTEM_NO_ACCESS"] = "keySystemNoAccess";
	ErrorDetails["KEY_SYSTEM_NO_SESSION"] = "keySystemNoSession";
	ErrorDetails["KEY_SYSTEM_NO_CONFIGURED_LICENSE"] = "keySystemNoConfiguredLicense";
	ErrorDetails["KEY_SYSTEM_LICENSE_REQUEST_FAILED"] = "keySystemLicenseRequestFailed";
	ErrorDetails["KEY_SYSTEM_SERVER_CERTIFICATE_REQUEST_FAILED"] = "keySystemServerCertificateRequestFailed";
	ErrorDetails["KEY_SYSTEM_SERVER_CERTIFICATE_UPDATE_FAILED"] = "keySystemServerCertificateUpdateFailed";
	ErrorDetails["KEY_SYSTEM_SESSION_UPDATE_FAILED"] = "keySystemSessionUpdateFailed";
	ErrorDetails["KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED"] = "keySystemStatusOutputRestricted";
	ErrorDetails["KEY_SYSTEM_STATUS_INTERNAL_ERROR"] = "keySystemStatusInternalError";
	ErrorDetails["KEY_SYSTEM_DESTROY_MEDIA_KEYS_ERROR"] = "keySystemDestroyMediaKeysError";
	ErrorDetails["KEY_SYSTEM_DESTROY_CLOSE_SESSION_ERROR"] = "keySystemDestroyCloseSessionError";
	ErrorDetails["KEY_SYSTEM_DESTROY_REMOVE_SESSION_ERROR"] = "keySystemDestroyRemoveSessionError";
	ErrorDetails["MANIFEST_LOAD_ERROR"] = "manifestLoadError";
	ErrorDetails["MANIFEST_LOAD_TIMEOUT"] = "manifestLoadTimeOut";
	ErrorDetails["MANIFEST_PARSING_ERROR"] = "manifestParsingError";
	ErrorDetails["MANIFEST_INCOMPATIBLE_CODECS_ERROR"] = "manifestIncompatibleCodecsError";
	ErrorDetails["LEVEL_EMPTY_ERROR"] = "levelEmptyError";
	ErrorDetails["PLAYLIST_UNCHANGED_ERROR"] = "playlistUnchangedError";
	ErrorDetails["LEVEL_LOAD_ERROR"] = "levelLoadError";
	ErrorDetails["LEVEL_LOAD_TIMEOUT"] = "levelLoadTimeOut";
	ErrorDetails["LEVEL_PARSING_ERROR"] = "levelParsingError";
	ErrorDetails["LEVEL_SWITCH_ERROR"] = "levelSwitchError";
	ErrorDetails["AUDIO_TRACK_LOAD_ERROR"] = "audioTrackLoadError";
	ErrorDetails["AUDIO_TRACK_LOAD_TIMEOUT"] = "audioTrackLoadTimeOut";
	ErrorDetails["SUBTITLE_LOAD_ERROR"] = "subtitleTrackLoadError";
	ErrorDetails["SUBTITLE_TRACK_LOAD_TIMEOUT"] = "subtitleTrackLoadTimeOut";
	ErrorDetails["FRAG_LOAD_ERROR"] = "fragLoadError";
	ErrorDetails["FRAG_LOAD_TIMEOUT"] = "fragLoadTimeOut";
	ErrorDetails["FRAG_DECRYPT_ERROR"] = "fragDecryptError";
	ErrorDetails["FRAG_PARSING_ERROR"] = "fragParsingError";
	ErrorDetails["FRAG_GAP"] = "fragGap";
	ErrorDetails["REMUX_ALLOC_ERROR"] = "remuxAllocError";
	ErrorDetails["KEY_LOAD_ERROR"] = "keyLoadError";
	ErrorDetails["KEY_LOAD_TIMEOUT"] = "keyLoadTimeOut";
	ErrorDetails["BUFFER_ADD_CODEC_ERROR"] = "bufferAddCodecError";
	ErrorDetails["BUFFER_INCOMPATIBLE_CODECS_ERROR"] = "bufferIncompatibleCodecsError";
	ErrorDetails["BUFFER_APPEND_ERROR"] = "bufferAppendError";
	ErrorDetails["BUFFER_APPENDING_ERROR"] = "bufferAppendingError";
	ErrorDetails["BUFFER_APPEND_NO_PROGRESS"] = "bufferAppendNoProgress";
	ErrorDetails["BUFFER_STALLED_ERROR"] = "bufferStalledError";
	ErrorDetails["BUFFER_FULL_ERROR"] = "bufferFullError";
	ErrorDetails["BUFFER_SEEK_OVER_HOLE"] = "bufferSeekOverHole";
	ErrorDetails["BUFFER_NUDGE_ON_STALL"] = "bufferNudgeOnStall";
	ErrorDetails["ASSET_LIST_LOAD_ERROR"] = "assetListLoadError";
	ErrorDetails["ASSET_LIST_LOAD_TIMEOUT"] = "assetListLoadTimeout";
	ErrorDetails["ASSET_LIST_PARSING_ERROR"] = "assetListParsingError";
	ErrorDetails["INTERSTITIAL_ASSET_ITEM_ERROR"] = "interstitialAssetItemError";
	ErrorDetails["INTERNAL_EXCEPTION"] = "internalException";
	ErrorDetails["INTERNAL_ABORTED"] = "aborted";
	ErrorDetails["ATTACH_MEDIA_ERROR"] = "attachMediaError";
	ErrorDetails["MEDIA_SOURCE_REQUIRES_RESET"] = "mediaSourceRequiresReset";
	ErrorDetails["UNKNOWN"] = "unknown";
	return ErrorDetails;
}({});
var Events = /*#__PURE__*/ function(Events) {
	Events["MEDIA_ATTACHING"] = "hlsMediaAttaching";
	Events["MEDIA_ATTACHED"] = "hlsMediaAttached";
	Events["MEDIA_DETACHING"] = "hlsMediaDetaching";
	Events["MEDIA_DETACHED"] = "hlsMediaDetached";
	Events["MEDIA_ENDED"] = "hlsMediaEnded";
	Events["STALL_RESOLVED"] = "hlsStallResolved";
	Events["BUFFER_RESET"] = "hlsBufferReset";
	Events["BUFFER_CODECS"] = "hlsBufferCodecs";
	Events["BUFFER_CREATED"] = "hlsBufferCreated";
	Events["BUFFER_APPENDING"] = "hlsBufferAppending";
	Events["BUFFER_APPENDED"] = "hlsBufferAppended";
	Events["BUFFER_EOS"] = "hlsBufferEos";
	Events["BUFFERED_TO_END"] = "hlsBufferedToEnd";
	Events["BUFFER_FLUSHING"] = "hlsBufferFlushing";
	Events["BUFFER_FLUSHED"] = "hlsBufferFlushed";
	Events["MANIFEST_LOADING"] = "hlsManifestLoading";
	Events["MANIFEST_LOADED"] = "hlsManifestLoaded";
	Events["MANIFEST_PARSED"] = "hlsManifestParsed";
	Events["LEVEL_SWITCHING"] = "hlsLevelSwitching";
	Events["LEVEL_SWITCHED"] = "hlsLevelSwitched";
	Events["LEVEL_LOADING"] = "hlsLevelLoading";
	Events["LEVEL_LOADED"] = "hlsLevelLoaded";
	Events["LEVEL_UPDATED"] = "hlsLevelUpdated";
	Events["LEVEL_PTS_UPDATED"] = "hlsLevelPtsUpdated";
	Events["LEVELS_UPDATED"] = "hlsLevelsUpdated";
	Events["AUDIO_TRACKS_UPDATED"] = "hlsAudioTracksUpdated";
	Events["AUDIO_TRACK_SWITCHING"] = "hlsAudioTrackSwitching";
	Events["AUDIO_TRACK_SWITCHED"] = "hlsAudioTrackSwitched";
	Events["AUDIO_TRACK_LOADING"] = "hlsAudioTrackLoading";
	Events["AUDIO_TRACK_LOADED"] = "hlsAudioTrackLoaded";
	Events["AUDIO_TRACK_UPDATED"] = "hlsAudioTrackUpdated";
	Events["SUBTITLE_TRACKS_UPDATED"] = "hlsSubtitleTracksUpdated";
	Events["SUBTITLE_TRACKS_CLEARED"] = "hlsSubtitleTracksCleared";
	Events["SUBTITLE_TRACK_SWITCH"] = "hlsSubtitleTrackSwitch";
	Events["SUBTITLE_TRACK_LOADING"] = "hlsSubtitleTrackLoading";
	Events["SUBTITLE_TRACK_LOADED"] = "hlsSubtitleTrackLoaded";
	Events["SUBTITLE_TRACK_UPDATED"] = "hlsSubtitleTrackUpdated";
	Events["SUBTITLE_FRAG_PROCESSED"] = "hlsSubtitleFragProcessed";
	Events["CUES_PARSED"] = "hlsCuesParsed";
	Events["NON_NATIVE_TEXT_TRACKS_FOUND"] = "hlsNonNativeTextTracksFound";
	Events["INIT_PTS_FOUND"] = "hlsInitPtsFound";
	Events["FRAG_LOADING"] = "hlsFragLoading";
	Events["FRAG_LOAD_EMERGENCY_ABORTED"] = "hlsFragLoadEmergencyAborted";
	Events["FRAG_LOADED"] = "hlsFragLoaded";
	Events["FRAG_DECRYPTED"] = "hlsFragDecrypted";
	Events["FRAG_PARSING_INIT_SEGMENT"] = "hlsFragParsingInitSegment";
	Events["FRAG_PARSING_USERDATA"] = "hlsFragParsingUserdata";
	Events["FRAG_PARSING_METADATA"] = "hlsFragParsingMetadata";
	Events["FRAG_PARSED"] = "hlsFragParsed";
	Events["FRAG_BUFFERED"] = "hlsFragBuffered";
	Events["FRAG_CHANGED"] = "hlsFragChanged";
	Events["FPS_DROP"] = "hlsFpsDrop";
	Events["FPS_DROP_LEVEL_CAPPING"] = "hlsFpsDropLevelCapping";
	Events["MAX_AUTO_LEVEL_UPDATED"] = "hlsMaxAutoLevelUpdated";
	Events["ERROR"] = "hlsError";
	Events["DESTROYING"] = "hlsDestroying";
	Events["KEY_LOADING"] = "hlsKeyLoading";
	Events["KEY_LOADED"] = "hlsKeyLoaded";
	Events["LIVE_BACK_BUFFER_REACHED"] = "hlsLiveBackBufferReached";
	Events["BACK_BUFFER_REACHED"] = "hlsBackBufferReached";
	Events["STEERING_MANIFEST_LOADED"] = "hlsSteeringManifestLoaded";
	Events["ASSET_LIST_LOADING"] = "hlsAssetListLoading";
	Events["ASSET_LIST_LOADED"] = "hlsAssetListLoaded";
	Events["INTERSTITIALS_UPDATED"] = "hlsInterstitialsUpdated";
	Events["INTERSTITIALS_BUFFERED_TO_BOUNDARY"] = "hlsInterstitialsBufferedToBoundary";
	Events["INTERSTITIAL_ASSET_PLAYER_CREATED"] = "hlsInterstitialAssetPlayerCreated";
	Events["INTERSTITIAL_STARTED"] = "hlsInterstitialStarted";
	Events["INTERSTITIAL_ASSET_STARTED"] = "hlsInterstitialAssetStarted";
	Events["INTERSTITIAL_ASSET_ENDED"] = "hlsInterstitialAssetEnded";
	Events["INTERSTITIAL_ASSET_ERROR"] = "hlsInterstitialAssetError";
	Events["INTERSTITIAL_ENDED"] = "hlsInterstitialEnded";
	Events["INTERSTITIALS_PRIMARY_RESUMED"] = "hlsInterstitialsPrimaryResumed";
	Events["PLAYOUT_LIMIT_REACHED"] = "hlsPlayoutLimitReached";
	Events["EVENT_CUE_ENTER"] = "hlsEventCueEnter";
	return Events;
}({});
/**
* Defines each Event type and payload by Event name. Used in {@link hls.js#HlsEventEmitter} to strongly type the event listener API.
*/
function getDefaultExportFromCjs(x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var urlToolkit = { exports: {} };
var hasRequiredUrlToolkit;
function requireUrlToolkit() {
	if (hasRequiredUrlToolkit) return urlToolkit.exports;
	hasRequiredUrlToolkit = 1;
	(function(module, exports) {
		(function(root) {
			var URL_REGEX = /^(?=((?:[a-zA-Z0-9+\-.]+:)?))\1(?=((?:\/\/[^\/?#]*)?))\2(?=((?:(?:[^?#\/]*\/)*[^;?#\/]*)?))\3((?:;[^?#]*)?)(\?[^#]*)?(#[^]*)?$/;
			var FIRST_SEGMENT_REGEX = /^(?=([^\/?#]*))\1([^]*)$/;
			var SLASH_DOT_REGEX = /(?:\/|^)\.(?=\/)/g;
			var SLASH_DOT_DOT_REGEX = /(?:\/|^)\.\.\/(?!\.\.\/)[^\/]*(?=\/)/g;
			var URLToolkit = {
				buildAbsoluteURL: function(baseURL, relativeURL, opts) {
					opts = opts || {};
					baseURL = baseURL.trim();
					relativeURL = relativeURL.trim();
					if (!relativeURL) {
						if (!opts.alwaysNormalize) return baseURL;
						var basePartsForNormalise = URLToolkit.parseURL(baseURL);
						if (!basePartsForNormalise) throw new Error("Error trying to parse base URL.");
						basePartsForNormalise.path = URLToolkit.normalizePath(basePartsForNormalise.path);
						return URLToolkit.buildURLFromParts(basePartsForNormalise);
					}
					var relativeParts = URLToolkit.parseURL(relativeURL);
					if (!relativeParts) throw new Error("Error trying to parse relative URL.");
					if (relativeParts.scheme) {
						if (!opts.alwaysNormalize) return relativeURL;
						relativeParts.path = URLToolkit.normalizePath(relativeParts.path);
						return URLToolkit.buildURLFromParts(relativeParts);
					}
					var baseParts = URLToolkit.parseURL(baseURL);
					if (!baseParts) throw new Error("Error trying to parse base URL.");
					if (!baseParts.netLoc && baseParts.path && baseParts.path[0] !== "/") {
						var pathParts = FIRST_SEGMENT_REGEX.exec(baseParts.path);
						baseParts.netLoc = pathParts[1];
						baseParts.path = pathParts[2];
					}
					if (baseParts.netLoc && !baseParts.path) baseParts.path = "/";
					var builtParts = {
						scheme: baseParts.scheme,
						netLoc: relativeParts.netLoc,
						path: null,
						params: relativeParts.params,
						query: relativeParts.query,
						fragment: relativeParts.fragment
					};
					if (!relativeParts.netLoc) {
						builtParts.netLoc = baseParts.netLoc;
						if (relativeParts.path[0] !== "/") {
							if (!relativeParts.path) {
								builtParts.path = baseParts.path;
								if (!relativeParts.params) {
									builtParts.params = baseParts.params;
									if (!relativeParts.query) builtParts.query = baseParts.query;
								}
							} else {
								var baseURLPath = baseParts.path;
								var newPath = baseURLPath.substring(0, baseURLPath.lastIndexOf("/") + 1) + relativeParts.path;
								builtParts.path = URLToolkit.normalizePath(newPath);
							}
						}
					}
					if (builtParts.path === null) builtParts.path = opts.alwaysNormalize ? URLToolkit.normalizePath(relativeParts.path) : relativeParts.path;
					return URLToolkit.buildURLFromParts(builtParts);
				},
				parseURL: function(url) {
					var parts = URL_REGEX.exec(url);
					if (!parts) return null;
					return {
						scheme: parts[1] || "",
						netLoc: parts[2] || "",
						path: parts[3] || "",
						params: parts[4] || "",
						query: parts[5] || "",
						fragment: parts[6] || ""
					};
				},
				normalizePath: function(path) {
					path = path.split("").reverse().join("").replace(SLASH_DOT_REGEX, "");
					while (path.length !== (path = path.replace(SLASH_DOT_DOT_REGEX, "")).length);
					return path.split("").reverse().join("");
				},
				buildURLFromParts: function(parts) {
					return parts.scheme + parts.netLoc + parts.path + parts.params + parts.query + parts.fragment;
				}
			};
			module.exports = URLToolkit;
		})();
	})(urlToolkit);
	return urlToolkit.exports;
}
var urlToolkitExports = requireUrlToolkit();
var LoadStats = class {
	constructor() {
		this.aborted = false;
		this.loaded = 0;
		this.retry = 0;
		this.total = 0;
		this.chunkCount = 0;
		this.bwEstimate = 0;
		this.loading = {
			start: 0,
			first: 0,
			end: 0
		};
		this.parsing = {
			start: 0,
			end: 0
		};
		this.buffering = {
			start: 0,
			first: 0,
			end: 0
		};
	}
};
var LoaderContextType = /*#__PURE__*/ function(LoaderContextType) {
	LoaderContextType["MANIFEST"] = "manifest";
	LoaderContextType["LEVEL"] = "level";
	LoaderContextType["AUDIO_TRACK"] = "audioTrack";
	LoaderContextType["SUBTITLE_TRACK"] = "subtitleTrack";
	LoaderContextType["MEDIA_FRAGMENT"] = "media-fragment";
	LoaderContextType["KEY"] = "key";
	LoaderContextType["STEERING_MANIFEST"] = "steering-manifest";
	LoaderContextType["SERVER_CERTIFICATE"] = "server-certificate";
	LoaderContextType["INTERSTITIAL_ASSET_LIST"] = "interstitial-asset-list";
	return LoaderContextType;
}({});
var PlaylistLevelType = /*#__PURE__*/ function(PlaylistLevelType) {
	PlaylistLevelType["MAIN"] = "main";
	PlaylistLevelType["AUDIO"] = "audio";
	PlaylistLevelType["SUBTITLE"] = "subtitle";
	return PlaylistLevelType;
}({});
var ElementaryStreamTypes = {
	AUDIO: "audio",
	VIDEO: "video",
	AUDIOVIDEO: "audiovideo"
};
var BaseSegment = class {
	constructor(base) {
		this._byteRange = null;
		this._url = null;
		this._stats = null;
		this._streams = null;
		this.base = void 0;
		this.relurl = void 0;
		if (typeof base === "string") base = { url: base };
		this.base = base;
		makeEnumerable(this, "stats");
	}
	setByteRange(value, previous) {
		const params = value.split("@", 2);
		let start;
		if (params.length === 1) start = (previous == null ? void 0 : previous.byteRangeEndOffset) || 0;
		else start = parseInt(params[1]);
		this._byteRange = [start, parseInt(params[0]) + start];
	}
	get baseurl() {
		return this.base.url;
	}
	get byteRange() {
		if (this._byteRange === null) return [];
		return this._byteRange;
	}
	get byteRangeStartOffset() {
		return this.byteRange[0];
	}
	get byteRangeEndOffset() {
		return this.byteRange[1];
	}
	get elementaryStreams() {
		if (this._streams === null) this._streams = {
			[ElementaryStreamTypes.AUDIO]: null,
			[ElementaryStreamTypes.VIDEO]: null,
			[ElementaryStreamTypes.AUDIOVIDEO]: null
		};
		return this._streams;
	}
	set elementaryStreams(value) {
		this._streams = value;
	}
	get hasStats() {
		return this._stats !== null;
	}
	get hasStreams() {
		return this._streams !== null;
	}
	get stats() {
		if (this._stats === null) this._stats = new LoadStats();
		return this._stats;
	}
	set stats(value) {
		this._stats = value;
	}
	get url() {
		if (!this._url && this.relurl) this._url = urlToolkitExports.buildAbsoluteURL(this.baseurl, this.relurl, { alwaysNormalize: true });
		return this._url || "";
	}
	set url(value) {
		this._url = value;
	}
	clearElementaryStreamInfo() {
		const { elementaryStreams } = this;
		elementaryStreams[ElementaryStreamTypes.AUDIO] = null;
		elementaryStreams[ElementaryStreamTypes.VIDEO] = null;
		elementaryStreams[ElementaryStreamTypes.AUDIOVIDEO] = null;
		this.url = null;
	}
};
function isMediaFragment(frag) {
	return frag.sn !== "initSegment";
}
function mediaFragmentsAreEqual(frag, mediaFragment) {
	return frag.sn === (mediaFragment == null ? void 0 : mediaFragment.sn) && frag.level === mediaFragment.level;
}
function fragmentsAreEqual(frag, otherFrag) {
	return frag.sn === (otherFrag == null ? void 0 : otherFrag.sn) && frag.level === otherFrag.level && frag.cc === otherFrag.cc;
}
/**
* Object representing parsed data from an HLS Segment. Found in {@link hls.js#LevelDetails.fragments}.
*/
var Fragment = class extends BaseSegment {
	constructor(type, base) {
		super(base);
		this._decryptdata = null;
		this._programDateTime = null;
		this._ref = null;
		this._bitrate = void 0;
		this.rawProgramDateTime = null;
		this.tagList = [];
		this.duration = 0;
		this.sn = 0;
		this.levelkeys = void 0;
		this.type = void 0;
		this.loader = null;
		this.keyLoader = null;
		this.level = -1;
		this.cc = 0;
		this.startPTS = void 0;
		this.endPTS = void 0;
		this.startDTS = void 0;
		this.endDTS = void 0;
		this.start = 0;
		this.playlistOffset = 0;
		this.deltaPTS = void 0;
		this.maxStartPTS = void 0;
		this.minEndPTS = void 0;
		this.data = void 0;
		this.bitrateTest = false;
		this.title = null;
		this.initSegment = null;
		this.endList = void 0;
		this.gap = void 0;
		this.urlId = 0;
		this.type = type;
	}
	get byteLength() {
		if (this.hasStats) {
			const total = this.stats.total;
			if (total) return total;
		}
		if (this.byteRange.length) {
			const start = this.byteRange[0];
			const end = this.byteRange[1];
			if (isFiniteNumber(start) && isFiniteNumber(end)) return end - start;
		}
		return null;
	}
	get bitrate() {
		if (this.byteLength) return this.byteLength * 8 / this.duration;
		if (this._bitrate) return this._bitrate;
		return null;
	}
	set bitrate(value) {
		this._bitrate = value;
	}
	get decryptdata() {
		var _this$_decryptdata;
		const { levelkeys } = this;
		if (!levelkeys || levelkeys.NONE) return null;
		if (levelkeys.identity) {
			if (!this._decryptdata) this._decryptdata = levelkeys.identity.getDecryptData(this.sn);
		} else if (!((_this$_decryptdata = this._decryptdata) != null && _this$_decryptdata.keyId)) {
			const keyFormats = Object.keys(levelkeys);
			if (keyFormats.length === 1) {
				const levelKey = this._decryptdata = levelkeys[keyFormats[0]] || null;
				if (levelKey) this._decryptdata = levelKey.getDecryptData(this.sn, levelkeys);
			}
		}
		return this._decryptdata;
	}
	get end() {
		return this.start + this.duration;
	}
	get endProgramDateTime() {
		if (this.programDateTime === null) return null;
		const duration = !isFiniteNumber(this.duration) ? 0 : this.duration;
		return this.programDateTime + duration * 1e3;
	}
	get encrypted() {
		var _this$_decryptdata2;
		if ((_this$_decryptdata2 = this._decryptdata) != null && _this$_decryptdata2.encrypted) return true;
		else if (this.levelkeys) {
			var _this$levelkeys$keyFo;
			const keyFormats = Object.keys(this.levelkeys);
			const len = keyFormats.length;
			if (len > 1 || len === 1 && (_this$levelkeys$keyFo = this.levelkeys[keyFormats[0]]) != null && _this$levelkeys$keyFo.encrypted) return true;
		}
		return false;
	}
	get programDateTime() {
		if (this._programDateTime === null && this.rawProgramDateTime) this.programDateTime = Date.parse(this.rawProgramDateTime);
		return this._programDateTime;
	}
	set programDateTime(value) {
		if (!isFiniteNumber(value)) {
			this._programDateTime = this.rawProgramDateTime = null;
			return;
		}
		this._programDateTime = value;
	}
	get ref() {
		if (!isMediaFragment(this)) return null;
		if (!this._ref) this._ref = {
			base: this.base,
			start: this.start,
			duration: this.duration,
			sn: this.sn,
			programDateTime: this.programDateTime
		};
		return this._ref;
	}
	addStart(value) {
		this.setStart(this.start + value);
	}
	setStart(value) {
		this.start = value;
		if (this._ref) this._ref.start = value;
	}
	setDuration(value) {
		this.duration = value;
		if (this._ref) this._ref.duration = value;
	}
	setKeyFormat(keyFormat) {
		const levelkeys = this.levelkeys;
		if (levelkeys) {
			var _this$_decryptdata3;
			const key = levelkeys[keyFormat];
			if (key && !((_this$_decryptdata3 = this._decryptdata) != null && _this$_decryptdata3.keyId)) this._decryptdata = key.getDecryptData(this.sn, levelkeys);
		}
	}
	abortRequests() {
		var _this$loader, _this$keyLoader;
		(_this$loader = this.loader) == null || _this$loader.abort();
		(_this$keyLoader = this.keyLoader) == null || _this$keyLoader.abort();
	}
	setElementaryStreamInfo(type, startPTS, endPTS, startDTS, endDTS, partial = false) {
		const { elementaryStreams } = this;
		const info = elementaryStreams[type];
		if (!info) {
			elementaryStreams[type] = {
				startPTS,
				endPTS,
				startDTS,
				endDTS,
				partial
			};
			return;
		}
		info.startPTS = Math.min(info.startPTS, startPTS);
		info.endPTS = Math.max(info.endPTS, endPTS);
		info.startDTS = Math.min(info.startDTS, startDTS);
		info.endDTS = Math.max(info.endDTS, endDTS);
	}
};
/**
* Object representing parsed data from an HLS Partial Segment. Found in {@link hls.js#LevelDetails.partList}.
*/
var Part = class extends BaseSegment {
	constructor(partAttrs, frag, base, index, previous) {
		super(base);
		this.fragOffset = 0;
		this.duration = 0;
		this.independent = false;
		this.relurl = void 0;
		this.fragment = void 0;
		this.index = void 0;
		this.gap = false;
		this.duration = partAttrs.decimalFloatingPoint("DURATION");
		this.gap = partAttrs.bool("GAP");
		this.independent = partAttrs.bool("INDEPENDENT");
		this.relurl = partAttrs.enumeratedString("URI");
		this.fragment = frag;
		this.index = index;
		const byteRange = partAttrs.enumeratedString("BYTERANGE");
		if (byteRange) this.setByteRange(byteRange, previous);
		if (previous) this.fragOffset = previous.fragOffset + previous.duration;
	}
	get start() {
		return this.fragment.start + this.fragOffset;
	}
	get end() {
		return this.start + this.duration;
	}
	get loaded() {
		const { elementaryStreams } = this;
		return !!(elementaryStreams.audio || elementaryStreams.video || elementaryStreams.audiovideo || this.fragment.type === PlaylistLevelType.SUBTITLE && this.stats.loading.end > 0);
	}
};
function getOwnPropertyDescriptorFromPrototypeChain(object, property) {
	const prototype = Object.getPrototypeOf(object);
	if (prototype) {
		const propertyDescriptor = Object.getOwnPropertyDescriptor(prototype, property);
		if (propertyDescriptor) return propertyDescriptor;
		return getOwnPropertyDescriptorFromPrototypeChain(prototype, property);
	}
}
function makeEnumerable(object, property) {
	const d = getOwnPropertyDescriptorFromPrototypeChain(object, property);
	if (d) {
		d.enumerable = true;
		Object.defineProperty(object, property, d);
	}
}
function _defineProperty(e, r, t) {
	return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
		value: t,
		enumerable: true,
		configurable: true,
		writable: true
	}) : e[r] = t, e;
}
function _extends() {
	return _extends = Object.assign ? Object.assign.bind() : function(n) {
		for (var e = 1; e < arguments.length; e++) {
			var t = arguments[e];
			for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
		}
		return n;
	}, _extends.apply(null, arguments);
}
function ownKeys(e, r) {
	var t = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var o = Object.getOwnPropertySymbols(e);
		r && (o = o.filter(function(r) {
			return Object.getOwnPropertyDescriptor(e, r).enumerable;
		})), t.push.apply(t, o);
	}
	return t;
}
function _objectSpread2(e) {
	for (var r = 1; r < arguments.length; r++) {
		var t = null != arguments[r] ? arguments[r] : {};
		r % 2 ? ownKeys(Object(t), true).forEach(function(r) {
			_defineProperty(e, r, t[r]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
			Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
		});
	}
	return e;
}
function _toPrimitive(t, r) {
	if ("object" != typeof t || !t) return t;
	var e = t[Symbol.toPrimitive];
	if (void 0 !== e) {
		var i = e.call(t, r);
		if ("object" != typeof i) return i;
		throw new TypeError("@@toPrimitive must return a primitive value.");
	}
	return ("string" === r ? String : Number)(t);
}
function _toPropertyKey(t) {
	var i = _toPrimitive(t, "string");
	return "symbol" == typeof i ? i : i + "";
}
function isTimeoutError(error) {
	switch (error.details) {
		case ErrorDetails.FRAG_LOAD_TIMEOUT:
		case ErrorDetails.KEY_LOAD_TIMEOUT:
		case ErrorDetails.LEVEL_LOAD_TIMEOUT:
		case ErrorDetails.MANIFEST_LOAD_TIMEOUT:
		case ErrorDetails.AUDIO_TRACK_LOAD_TIMEOUT:
		case ErrorDetails.SUBTITLE_TRACK_LOAD_TIMEOUT:
		case ErrorDetails.ASSET_LIST_LOAD_TIMEOUT: return true;
	}
	return false;
}
function isKeyError(error) {
	return error.details.startsWith("key");
}
function isUnusableKeyError(error) {
	return isKeyError(error) && !!error.frag && !error.frag.decryptdata;
}
function getRetryConfig(loadPolicy, error) {
	const isTimeout = isTimeoutError(error);
	return loadPolicy.default[`${isTimeout ? "timeout" : "error"}Retry`];
}
function getRetryDelay(retryConfig, retryCount) {
	const backoffFactor = retryConfig.backoff === "linear" ? 1 : Math.pow(2, retryCount);
	return Math.min(backoffFactor * retryConfig.retryDelayMs, retryConfig.maxRetryDelayMs);
}
function getLoaderConfigWithoutReties(loderConfig) {
	return _objectSpread2(_objectSpread2({}, loderConfig), {
		errorRetry: null,
		timeoutRetry: null
	});
}
function shouldRetry(retryConfig, retryCount, isTimeout, loaderResponse) {
	if (!retryConfig) return false;
	const httpStatus = loaderResponse == null ? void 0 : loaderResponse.code;
	const retry = retryCount < retryConfig.maxNumRetry && (retryForHttpStatus(httpStatus) || !!isTimeout);
	return retryConfig.shouldRetry ? retryConfig.shouldRetry(retryConfig, retryCount, isTimeout, loaderResponse, retry) : retry;
}
function retryForHttpStatus(httpStatus) {
	return offlineHttpStatus(httpStatus) || !!httpStatus && (httpStatus < 400 || httpStatus > 499);
}
function offlineHttpStatus(httpStatus) {
	return httpStatus === 0 && navigator.onLine === false;
}
function isPenaltyExpired(level, expireMs) {
	return expireMs > 0 && level.loadError > 0 && level.loadErrorTime !== 0 && self.performance.now() - level.loadErrorTime > expireMs;
}
var EWMA = class {
	constructor(halfLife, estimate = 0, weight = 0) {
		this.halfLife = void 0;
		this.alpha_ = void 0;
		this.estimate_ = void 0;
		this.totalWeight_ = void 0;
		this.halfLife = halfLife;
		this.alpha_ = halfLife ? Math.exp(Math.log(.5) / halfLife) : 0;
		this.estimate_ = estimate;
		this.totalWeight_ = weight;
	}
	sample(weight, value) {
		const adjAlpha = Math.pow(this.alpha_, weight);
		this.estimate_ = value * (1 - adjAlpha) + adjAlpha * this.estimate_;
		this.totalWeight_ += weight;
	}
	getTotalWeight() {
		return this.totalWeight_;
	}
	getEstimate() {
		if (this.alpha_) {
			const zeroFactor = 1 - Math.pow(this.alpha_, this.totalWeight_);
			if (zeroFactor) return this.estimate_ / zeroFactor;
		}
		return this.estimate_;
	}
};
var EwmaBandWidthEstimator = class {
	constructor(slow, fast, defaultEstimate, defaultTTFB = 100) {
		this.defaultEstimate_ = void 0;
		this.minWeight_ = void 0;
		this.minDelayMs_ = void 0;
		this.slow_ = void 0;
		this.fast_ = void 0;
		this.defaultTTFB_ = void 0;
		this.ttfb_ = void 0;
		this.defaultEstimate_ = defaultEstimate;
		this.minWeight_ = .001;
		this.minDelayMs_ = 50;
		this.slow_ = new EWMA(slow);
		this.fast_ = new EWMA(fast);
		this.defaultTTFB_ = defaultTTFB;
		this.ttfb_ = new EWMA(slow);
	}
	update(slow, fast) {
		const { slow_, fast_, ttfb_ } = this;
		if (slow_.halfLife !== slow) this.slow_ = new EWMA(slow, slow_.getEstimate(), slow_.getTotalWeight());
		if (fast_.halfLife !== fast) this.fast_ = new EWMA(fast, fast_.getEstimate(), fast_.getTotalWeight());
		if (ttfb_.halfLife !== slow) this.ttfb_ = new EWMA(slow, ttfb_.getEstimate(), ttfb_.getTotalWeight());
	}
	sample(durationMs, numBytes) {
		if (numBytes <= 0) return;
		const minDelay = Math.min(this.minDelayMs_, numBytes / 1e5);
		const numBits = 8 * numBytes;
		const durationS = Math.max(durationMs, minDelay) / 1e3;
		const bandwidthInBps = numBits / durationS;
		this.fast_.sample(durationS, bandwidthInBps);
		this.slow_.sample(durationS, bandwidthInBps);
	}
	sampleTTFB(ttfb) {
		const seconds = ttfb / 1e3;
		const weight = Math.sqrt(2) * Math.exp(-Math.pow(seconds, 2) / 2);
		this.ttfb_.sample(weight, Math.max(ttfb, 5));
	}
	canEstimate() {
		return this.fast_.getTotalWeight() >= this.minWeight_;
	}
	getEstimate() {
		if (this.canEstimate()) return Math.min(this.fast_.getEstimate(), this.slow_.getEstimate());
		else return this.defaultEstimate_;
	}
	getEstimateTTFB() {
		if (this.ttfb_.getTotalWeight() >= this.minWeight_) return this.ttfb_.getEstimate();
		else return this.defaultTTFB_;
	}
	get defaultEstimate() {
		return this.defaultEstimate_;
	}
	destroy() {}
};
var Logger = class {
	constructor(label, logger) {
		this.trace = void 0;
		this.debug = void 0;
		this.log = void 0;
		this.warn = void 0;
		this.info = void 0;
		this.error = void 0;
		const lb = `[${label}]:`;
		this.trace = noop;
		this.debug = logger.debug.bind(null, lb);
		this.log = logger.log.bind(null, lb);
		this.warn = logger.warn.bind(null, lb);
		this.info = logger.info.bind(null, lb);
		this.error = logger.error.bind(null, lb);
	}
};
var noop = function noop() {};
var fakeLogger = {
	trace: noop,
	debug: noop,
	log: noop,
	warn: noop,
	info: noop,
	error: noop
};
function createLogger() {
	return _extends({}, fakeLogger);
}
function consolePrintFn(type, id) {
	const func = self.console[type];
	return func ? func.bind(self.console, `${id ? "[" + id + "] " : ""}[${type}] >`) : noop;
}
function getLoggerFn(key, debugConfig, id) {
	return debugConfig[key] ? debugConfig[key].bind(debugConfig) : consolePrintFn(key, id);
}
var exportedLogger = createLogger();
function enableLogs(debugConfig, context, id) {
	const newLogger = createLogger();
	if (typeof console === "object" && debugConfig === true || typeof debugConfig === "object") {
		const keys = [
			"debug",
			"log",
			"info",
			"warn",
			"error"
		];
		keys.forEach((key) => {
			newLogger[key] = getLoggerFn(key, debugConfig, id);
		});
		try {
			newLogger.log(`Debug logs enabled for "${context}" in hls.js version 1.7.4`);
		} catch (e) {
			return createLogger();
		}
		keys.forEach((key) => {
			exportedLogger[key] = getLoggerFn(key, debugConfig);
		});
	} else _extends(exportedLogger, newLogger);
	return newLogger;
}
var logger = exportedLogger;
var emptyEs;
var hasRequiredEmptyEs;
function requireEmptyEs() {
	if (hasRequiredEmptyEs) return emptyEs;
	hasRequiredEmptyEs = 1;
	emptyEs = {};
	return emptyEs;
}
var emptyEsExports = requireEmptyEs();
var Cues = /*@__PURE__*/ getDefaultExportFromCjs(emptyEsExports);
function getMediaSource(preferManagedMediaSource = true) {
	if (typeof self === "undefined") return void 0;
	return (preferManagedMediaSource || !self.MediaSource) && self.ManagedMediaSource || self.MediaSource || self.WebKitMediaSource;
}
function isManagedMediaSource(source) {
	return typeof self !== "undefined" && source === self.ManagedMediaSource;
}
function isCompatibleTrackChange(currentTracks, requiredTracks) {
	const trackNames = Object.keys(currentTracks);
	const requiredTrackNames = Object.keys(requiredTracks);
	const trackCount = trackNames.length;
	const requiredTrackCount = requiredTrackNames.length;
	return !trackCount || !requiredTrackCount || trackCount === requiredTrackCount && !trackNames.some((name) => requiredTrackNames.indexOf(name) === -1);
}
/**
* Encodes an ArrayBuffer as a hexadecimal string.
*
* @param buffer - The ArrayBuffer to encode.
* @returns The hexadecimal string representation.
*
* @public
*
* @example
* {@includeCode ../test/arrayBufferToHex.test.ts#example}
*/
/**
* Checks if the given value is `ArrayBufferLike` (i.e. an `ArrayBuffer`
* or a `SharedArrayBuffer`).
*
* This function safely handles environments where
* `SharedArrayBuffer` is not defined, such as non-cross-origin
* isolated browser contexts.
*
* @param value - The value to check.
* @returns `true` if the value is an `ArrayBuffer` or `SharedArrayBuffer`.
*
* @public
*
* @example
* {@includeCode ../test/isArrayBufferLike.test.ts#example}
*/
function isArrayBufferLike(value) {
	return value instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer;
}
/**
* UTF-16 Encoding.
*
* @public
*/
var UTF_16 = "utf-16";
/**
* UTF-16 Big Endian Encoding.
*
* @public
*/
var UTF_16_BE = "utf-16be";
/**
* UTF-16 Little Endian Encoding.
*
* @public
*/
var UTF_16_LE = "utf-16le";
/**
* UTF-8 Encoding.
*
* @public
*/
var UTF_8 = "utf-8";
/**
* Converts an ArrayBuffer or ArrayBufferView to a string. Similar to `TextDecoder.decode`
* but with a fallback for environments that don't support `TextDecoder`.
*
* @param data - The data to decode.
* @param options - The options for the decoding.
* @returns The string representation of the ArrayBuffer.
*
* @public
*
* @example
* {@includeCode ../test/decodeText.test.ts#example}
*/
function decodeText(data, options = {}) {
	let view;
	if (isArrayBufferLike(data)) view = new DataView(data);
	else view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	let byteOffset = 0;
	let { encoding } = options;
	if (!encoding) {
		const first = view.getUint8(0);
		const second = view.getUint8(1);
		if (first == 239 && second == 187 && view.getUint8(2) == 191) {
			encoding = UTF_8;
			byteOffset = 3;
		} else if (first == 254 && second == 255) {
			encoding = UTF_16_BE;
			byteOffset = 2;
		} else if (first == 255 && second == 254) {
			encoding = UTF_16_LE;
			byteOffset = 2;
		} else encoding = UTF_8;
	}
	if (typeof TextDecoder !== "undefined") return new TextDecoder(encoding).decode(view);
	const { byteLength } = view;
	const endian = encoding !== UTF_16_BE;
	let str = "";
	let char;
	while (byteOffset < byteLength) {
		switch (encoding) {
			case UTF_8:
				char = view.getUint8(byteOffset);
				if (char < 128) byteOffset++;
				else if (char >= 194 && char <= 223) {
					if (byteOffset + 1 < byteLength) {
						const byte2 = view.getUint8(byteOffset + 1);
						if (byte2 >= 128 && byte2 <= 191) {
							char = (char & 31) << 6 | byte2 & 63;
							byteOffset += 2;
						} else byteOffset++;
					} else byteOffset++;
				} else if (char >= 224 && char <= 239) {
					if (byteOffset + 2 <= byteLength - 1) {
						const byte2 = view.getUint8(byteOffset + 1);
						const byte3 = view.getUint8(byteOffset + 2);
						if (byte2 >= 128 && byte2 <= 191 && byte3 >= 128 && byte3 <= 191) {
							char = (char & 15) << 12 | (byte2 & 63) << 6 | byte3 & 63;
							byteOffset += 3;
						} else byteOffset++;
					} else byteOffset++;
				} else if (char >= 240 && char <= 244) {
					if (byteOffset + 3 <= byteLength - 1) {
						const byte2 = view.getUint8(byteOffset + 1);
						const byte3 = view.getUint8(byteOffset + 2);
						const byte4 = view.getUint8(byteOffset + 3);
						if (byte2 >= 128 && byte2 <= 191 && byte3 >= 128 && byte3 <= 191 && byte4 >= 128 && byte4 <= 191) {
							char = (char & 7) << 18 | (byte2 & 63) << 12 | (byte3 & 63) << 6 | byte4 & 63;
							byteOffset += 4;
						} else byteOffset++;
					} else byteOffset++;
				} else byteOffset++;
				break;
			case UTF_16_BE:
			case UTF_16:
			case UTF_16_LE:
				char = view.getUint16(byteOffset, endian);
				byteOffset += 2;
		}
		str += String.fromCodePoint(char);
	}
	return str;
}
/**
* Generate a random v4 UUID
*
* @returns A random v4 UUID
*
* @public
*/
function uuid() {
	try {
		return crypto.randomUUID();
	} catch (error) {
		try {
			const url = URL.createObjectURL(new Blob());
			const uuid$1 = url.toString();
			URL.revokeObjectURL(url);
			return uuid$1.slice(uuid$1.lastIndexOf("/") + 1);
		} catch (error$1) {
			let dt = (/* @__PURE__ */ new Date()).getTime();
			return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
				const r = (dt + Math.random() * 16) % 16 | 0;
				dt = Math.floor(dt / 16);
				return (c == "x" ? r : r & 3 | 8).toString(16);
			});
		}
	}
}
/**
* Returns true if an ID3 header can be found at offset in data
*
* @param data - The data to search in
* @param offset - The offset at which to start searching
*
* @returns `true` if an ID3 header is found
*
* @internal
*/
function isId3Header(data, offset) {
	if (offset + 10 <= data.length) {
		if (data[offset] === 73 && data[offset + 1] === 68 && data[offset + 2] === 51) {
			if (data[offset + 3] < 255 && data[offset + 4] < 255) {
				if (data[offset + 6] < 128 && data[offset + 7] < 128 && data[offset + 8] < 128 && data[offset + 9] < 128) return true;
			}
		}
	}
	return false;
}
/**
* Read ID3 size
*
* @param data - The data to read from
* @param offset - The offset at which to start reading
*
* @returns The size
*
* @internal
*/
function readId3Size(data, offset) {
	let size = 0;
	size = (data[offset] & 127) << 21;
	size |= (data[offset + 1] & 127) << 14;
	size |= (data[offset + 2] & 127) << 7;
	size |= data[offset + 3] & 127;
	return size;
}
/**
* Checks if the given data contains an ID3 tag.
*
* @param data - The data to check
* @param offset - The offset at which to start checking
*
* @returns `true` if an ID3 tag is found
*
* @public
*/
function canParseId3(data, offset) {
	return isId3Header(data, offset) && readId3Size(data, offset + 6) + 10 <= data.length - offset;
}
/**
* Returns true if an ID3 footer can be found at offset in data
*
* @param data - The data to search in
* @param offset - The offset at which to start searching
*
* @returns `true` if an ID3 footer is found
*
* @internal
*/
function isId3Footer(data, offset) {
	if (offset + 10 <= data.length) {
		if (data[offset] === 51 && data[offset + 1] === 68 && data[offset + 2] === 73) {
			if (data[offset + 3] < 255 && data[offset + 4] < 255) {
				if (data[offset + 6] < 128 && data[offset + 7] < 128 && data[offset + 8] < 128 && data[offset + 9] < 128) return true;
			}
		}
	}
	return false;
}
/**
* Returns any adjacent ID3 tags found in data starting at offset, as one block of data
*
* @param data - The data to search in
* @param offset - The offset at which to start searching
*
* @returns The block of data containing any ID3 tags found
* or `undefined` if no header is found at the starting offset
*
* @internal
*
*/
function getId3Data(data, offset) {
	const front = offset;
	let length = 0;
	while (isId3Header(data, offset)) {
		length += 10;
		const size = readId3Size(data, offset + 6);
		length += size;
		if (isId3Footer(data, offset + 10)) length += 10;
		offset += length;
	}
	if (length > 0) return data.subarray(front, front + length);
}
/**
* @internal
*/
function toArrayBuffer(view$1) {
	if (isArrayBufferLike(view$1)) return view$1;
	else {
		if (view$1.byteOffset == 0 && view$1.byteLength == view$1.buffer.byteLength) return view$1.buffer;
		return new Uint8Array(view$1).buffer;
	}
}
/**
* @internal
*/
function toUint8(data, offset = 0, length = Infinity) {
	return view(data, offset, length, Uint8Array);
}
function view(data, offset, length, Type) {
	const buffer = unsafeGetArrayBuffer(data);
	let bytesPerElement = 1;
	if ("BYTES_PER_ELEMENT" in Type) bytesPerElement = Type.BYTES_PER_ELEMENT;
	const dataOffset = isArrayBufferView(data) ? data.byteOffset : 0;
	const dataEnd = (dataOffset + data.byteLength) / bytesPerElement;
	const rawStart = (dataOffset + offset) / bytesPerElement;
	const start = Math.floor(Math.max(0, Math.min(rawStart, dataEnd)));
	return new Type(buffer, start, Math.floor(Math.min(start + Math.max(length, 0), dataEnd)) - start);
}
function unsafeGetArrayBuffer(view$1) {
	if (isArrayBufferLike(view$1)) return view$1;
	else return view$1.buffer;
}
function isArrayBufferView(obj) {
	return obj && isArrayBufferLike(obj.buffer) && obj.byteLength !== void 0 && obj.byteOffset !== void 0;
}
/**
* Converts a UTF-8 array to a string.
*
* @param array - The UTF-8 array to convert
* @param exitOnNull - Whether to exit on the first null byte
*
* @returns The string
*
* @internal
*/
function utf8ArrayToStr(array, exitOnNull = false) {
	const byteLength = exitOnNull ? array.indexOf(0) : array.length;
	const result = decodeText(new DataView(array.buffer, array.byteOffset, byteLength), { encoding: UTF_8 });
	return exitOnNull ? result : result.replace(/\0/g, "");
}
/**
* Decode an ID3 APIC frame.
*
* @param frame - the ID3 APIC frame
*
* @returns The decoded ID3 APIC frame
*
* @internal
*/
function decodeId3ImageFrame(frame) {
	const metadataFrame = {
		key: frame.type,
		description: "",
		data: "",
		mimeType: null,
		pictureType: null
	};
	const utf8Encoding = 3;
	if (frame.size < 2) return;
	if (frame.data[0] !== utf8Encoding) {
		console.log("Ignore frame with unrecognized character encoding");
		return;
	}
	const mimeTypeEndIndex = frame.data.subarray(1).indexOf(0);
	if (mimeTypeEndIndex === -1) return;
	const mimeType = utf8ArrayToStr(toUint8(frame.data, 1, mimeTypeEndIndex));
	const pictureType = frame.data[2 + mimeTypeEndIndex];
	const descriptionEndIndex = frame.data.subarray(3 + mimeTypeEndIndex).indexOf(0);
	if (descriptionEndIndex === -1) return;
	const description = utf8ArrayToStr(toUint8(frame.data, 3 + mimeTypeEndIndex, descriptionEndIndex));
	let data;
	if (mimeType === "-->") data = utf8ArrayToStr(toUint8(frame.data, 4 + mimeTypeEndIndex + descriptionEndIndex));
	else data = toArrayBuffer(frame.data.subarray(4 + mimeTypeEndIndex + descriptionEndIndex));
	metadataFrame.mimeType = mimeType;
	metadataFrame.pictureType = pictureType;
	metadataFrame.description = description;
	metadataFrame.data = data;
	return metadataFrame;
}
/**
* Decode an ID3 PRIV frame.
*
* @param frame - the ID3 PRIV frame
*
* @returns The decoded ID3 PRIV frame
*
* @internal
*/
function decodeId3PrivFrame(frame) {
	if (frame.size < 2) return;
	const owner = utf8ArrayToStr(frame.data, true);
	const privateData = new Uint8Array(frame.data.subarray(owner.length + 1));
	return {
		key: frame.type,
		info: owner,
		data: privateData.buffer
	};
}
/**
* Decodes an ID3 text frame
*
* @param frame - the ID3 text frame
*
* @returns The decoded ID3 text frame
*
* @internal
*/
function decodeId3TextFrame(frame) {
	if (frame.size < 2) return;
	if (frame.type === "TXXX") {
		let index = 1;
		const { data } = frame;
		const description = utf8ArrayToStr(data.subarray(index), true);
		index += description.length + 1;
		const value = utf8ArrayToStr(data.subarray(index));
		return {
			key: frame.type,
			info: description,
			data: value
		};
	}
	const text = utf8ArrayToStr(frame.data.subarray(1));
	return {
		key: frame.type,
		info: "",
		data: text
	};
}
/**
* Decode a URL frame
*
* @param frame - the ID3 URL frame
*
* @returns The decoded ID3 URL frame
*
* @internal
*/
function decodeId3UrlFrame(frame) {
	if (frame.type === "WXXX") {
		if (frame.size < 2) return;
		let index = 1;
		const description = utf8ArrayToStr(frame.data.subarray(index), true);
		index += description.length + 1;
		const value = utf8ArrayToStr(frame.data.subarray(index));
		return {
			key: frame.type,
			info: description,
			data: value
		};
	}
	const url = utf8ArrayToStr(frame.data);
	return {
		key: frame.type,
		info: "",
		data: url
	};
}
/**
* Decode an ID3 frame.
*
* @param frame - the ID3 frame
*
* @returns The decoded ID3 frame
*
* @internal
*/
function decodeId3Frame(frame) {
	if (frame.type === "PRIV") return decodeId3PrivFrame(frame);
	else if (frame.type[0] === "W") return decodeId3UrlFrame(frame);
	else if (frame.type === "APIC") return decodeId3ImageFrame(frame);
	return decodeId3TextFrame(frame);
}
/**
* Returns the data of an ID3 frame.
*
* @param data - The data to read from
*
* @returns The data of the ID3 frame
*
* @internal
*/
function getId3FrameData(data) {
	const type = String.fromCharCode(data[0], data[1], data[2], data[3]);
	const size = readId3Size(data, 4);
	const offset = 10;
	return {
		type,
		size,
		data: data.subarray(offset, offset + size)
	};
}
var HEADER_FOOTER_SIZE = 10;
var FRAME_SIZE = 10;
/**
* Returns an array of ID3 frames found in all the ID3 tags in the id3Data
*
* @param id3Data - The ID3 data containing one or more ID3 tags
*
* @returns Array of ID3 frame objects
*
* @public
*/
function getId3Frames(id3Data) {
	let offset = 0;
	const frames = [];
	while (isId3Header(id3Data, offset)) {
		const size = readId3Size(id3Data, offset + 6);
		if (id3Data[offset + 5] >> 6 & 1) offset += HEADER_FOOTER_SIZE;
		offset += HEADER_FOOTER_SIZE;
		const end = offset + size;
		while (offset + FRAME_SIZE < end) {
			const frameData = getId3FrameData(id3Data.subarray(offset));
			const frame = decodeId3Frame(frameData);
			if (frame) frames.push(frame);
			offset += frameData.size + HEADER_FOOTER_SIZE;
		}
		if (isId3Footer(id3Data, offset)) offset += HEADER_FOOTER_SIZE;
	}
	return frames;
}
/**
* Returns true if the ID3 frame is an Elementary Stream timestamp frame
*
* @param frame - the ID3 frame
*
* @returns `true` if the ID3 frame is an Elementary Stream timestamp frame
*
* @internal
*
*/
function isId3TimestampFrame(frame) {
	return frame && frame.key === "PRIV" && frame.info === "com.apple.streaming.transportStreamTimestamp";
}
/**
* Read a 33 bit timestamp from an ID3 frame.
*
* @param timeStampFrame - the ID3 frame
*
* @returns The timestamp
*
* @internal
*/
function readId3Timestamp(timeStampFrame) {
	if (timeStampFrame.data.byteLength === 8) {
		const data = new Uint8Array(timeStampFrame.data);
		const pts33Bit = data[3] & 1;
		let timestamp = (data[4] << 23) + (data[5] << 15) + (data[6] << 7) + data[7];
		timestamp /= 45;
		if (pts33Bit) timestamp += 47721858.84;
		return Math.round(timestamp);
	}
}
/**
* Searches for the Elementary Stream timestamp found in the ID3 data chunk
*
* @param data - Block of data containing one or more ID3 tags
*
* @returns The timestamp
*
* @public
*/
function getId3Timestamp(data) {
	const frames = getId3Frames(data);
	for (const frame of frames) if (isId3TimestampFrame(frame)) return readId3Timestamp(frame);
}
/**
*  hex dump helper class
*/
function arrayToHex(array) {
	let str = "";
	for (let i = 0; i < array.length; i++) {
		let h = array[i].toString(16);
		if (h.length < 2) h = "0" + h;
		str += h;
	}
	return str;
}
function hexToArrayBuffer(str) {
	return Uint8Array.from(str.replace(/^0x/, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(" ")).buffer;
}
function bin2str(data) {
	return String.fromCharCode.apply(null, data);
}
var UINT32_MAX = Math.pow(2, 32) - 1;
var types = {
	avc1: 1635148593,
	avcC: 1635148611,
	hvc1: 1752589105,
	hvcC: 1752589123,
	btrt: 1651798644,
	dinf: 1684631142,
	dref: 1685218662,
	esds: 1702061171,
	free: 1718773093,
	ftyp: 1718909296,
	hdlr: 1751411826,
	mdat: 1835295092,
	mdhd: 1835296868,
	mdia: 1835297121,
	mfhd: 1835427940,
	minf: 1835626086,
	moof: 1836019558,
	moov: 1836019574,
	mp4a: 1836069985,
	".mp3": 778924083,
	dac3: 1684103987,
	"ac-3": 1633889587,
	mvex: 1836475768,
	mvhd: 1836476516,
	pasp: 1885434736,
	sdtp: 1935963248,
	stbl: 1937007212,
	stco: 1937007471,
	stsc: 1937011555,
	stsd: 1937011556,
	stsz: 1937011578,
	stts: 1937011827,
	tfdt: 1952867444,
	tfhd: 1952868452,
	traf: 1953653094,
	trak: 1953653099,
	trun: 1953658222,
	trex: 1953654136,
	tkhd: 1953196132,
	vmhd: 1986881636,
	smhd: 1936549988
};
var RemuxerTrackIdConfig = {
	video: 1,
	audio: 2,
	id3: 3,
	text: 4
};
function readUint16(buffer, offset) {
	const val = buffer[offset] << 8 | buffer[offset + 1];
	return val < 0 ? 65536 + val : val;
}
function readUint32(buffer, offset) {
	const val = buffer[offset] << 24 | buffer[offset + 1] << 16 | buffer[offset + 2] << 8 | buffer[offset + 3];
	return val < 0 ? 4294967296 + val : val;
}
function readUint64(buffer, offset) {
	let result = readUint32(buffer, offset);
	result *= Math.pow(2, 32);
	result += readUint32(buffer, offset + 4);
	return result;
}
function readCString(buffer, offset) {
	let result = "";
	for (let i = offset; i < buffer.length; i++) {
		result += String.fromCharCode(buffer[i]);
		if (buffer[i] === 0) return result;
	}
	return null;
}
function readSint32(buffer, offset) {
	return buffer[offset] << 24 | buffer[offset + 1] << 16 | buffer[offset + 2] << 8 | buffer[offset + 3];
}
function writeUint32(buffer, offset, value) {
	buffer[offset] = value >> 24;
	buffer[offset + 1] = value >> 16 & 255;
	buffer[offset + 2] = value >> 8 & 255;
	buffer[offset + 3] = value & 255;
}
function hasBoxData(data, type) {
	const end = data.byteLength;
	for (let i = 0; i < end;) {
		const size = readUint32(data, i);
		if (size > 8 && readUint32(data, i + 4) === types[type]) return true;
		i = size > 1 ? i + size : end;
	}
	return false;
}
function findBox(data, path) {
	const results = [];
	if (!path.length) return results;
	findBoxPath(data, path, 0, 0, data.byteLength, results);
	return results;
}
function findBoxPath(data, path, pathIndex, start, end, results) {
	const pathType = path[pathIndex];
	if ((pathType == null ? void 0 : pathType.length) !== 4) return;
	const type0 = pathType.charCodeAt(0);
	const type1 = pathType.charCodeAt(1);
	const type2 = pathType.charCodeAt(2);
	const type3 = pathType.charCodeAt(3);
	const lastPathIndex = path.length - 1;
	for (let i = start; i < end;) {
		const hasHeader = i + 8 <= end;
		const size = i + 4 <= end ? data[i] * 16777216 + (data[i + 1] << 16 | data[i + 2] << 8 | data[i + 3]) : readUint32(data, i);
		const endbox = size > 1 ? i + size : end;
		if (hasHeader && data[i + 4] === type0 && data[i + 5] === type1 && data[i + 6] === type2 && data[i + 7] === type3) {
			const boxEnd = Math.min(endbox, end);
			if (pathIndex === lastPathIndex) results.push(data.subarray(i + 8, boxEnd));
			else findBoxPath(data, path, pathIndex + 1, i + 8, boxEnd, results);
		}
		i = endbox;
	}
}
function parseSegmentIndex(sidx) {
	const references = [];
	const version = sidx[0];
	let index = 8;
	const timescale = readUint32(sidx, index);
	index += 4;
	let earliestPresentationTime = 0;
	let firstOffset = 0;
	if (version === 0) {
		earliestPresentationTime = readUint32(sidx, index);
		firstOffset = readUint32(sidx, index + 4);
		index += 8;
	} else {
		earliestPresentationTime = readUint64(sidx, index);
		firstOffset = readUint64(sidx, index + 8);
		index += 16;
	}
	index += 2;
	let startByte = sidx.length + firstOffset;
	const referencesCount = readUint16(sidx, index);
	index += 2;
	for (let i = 0; i < referencesCount; i++) {
		let referenceIndex = index;
		const referenceInfo = readUint32(sidx, referenceIndex);
		referenceIndex += 4;
		const referenceSize = referenceInfo & 2147483647;
		if ((referenceInfo & 2147483648) >>> 31 === 1) {
			logger.warn("SIDX has hierarchical references (not supported)");
			return null;
		}
		const subsegmentDuration = readUint32(sidx, referenceIndex);
		referenceIndex += 4;
		references.push({
			referenceSize,
			subsegmentDuration,
			info: {
				duration: subsegmentDuration / timescale,
				start: startByte,
				end: startByte + referenceSize - 1
			}
		});
		startByte += referenceSize;
		referenceIndex += 4;
		index = referenceIndex;
	}
	return {
		earliestPresentationTime,
		timescale,
		version,
		referencesCount,
		references
	};
}
/**
* Parses an MP4 initialization segment and extracts stream type and
* timescale values for any declared tracks. Timescale values indicate the
* number of clock ticks per second to assume for time-based values
* elsewhere in the MP4.
*
* To determine the start time of an MP4, you need two pieces of
* information: the timescale unit and the earliest base media decode
* time. Multiple timescales can be specified within an MP4 but the
* base media decode time is always expressed in the timescale from
* the media header box for the track:
* ```
* moov > trak > mdia > mdhd.timescale
* moov > trak > mdia > hdlr
* ```
* @param initSegment the bytes of the init segment
* @returns a hash of track type to timescale values or null if
* the init segment is malformed.
*/
function parseInitSegment(initSegment) {
	const result = [];
	const traks = findBox(initSegment, ["moov", "trak"]);
	for (let i = 0; i < traks.length; i++) {
		const trak = traks[i];
		const tkhd = findBox(trak, ["tkhd"])[0];
		if (tkhd) {
			let version = tkhd[0];
			const trackId = readUint32(tkhd, version === 0 ? 12 : 20);
			const mdhd = findBox(trak, ["mdia", "mdhd"])[0];
			if (mdhd) {
				version = mdhd[0];
				const timescale = readUint32(mdhd, version === 0 ? 12 : 20);
				const hdlr = findBox(trak, ["mdia", "hdlr"])[0];
				if (hdlr) {
					const hdlrType = bin2str(hdlr.subarray(8, 12));
					const type = {
						soun: ElementaryStreamTypes.AUDIO,
						vide: ElementaryStreamTypes.VIDEO
					}[hdlrType];
					const stsdBox = findBox(trak, [
						"mdia",
						"minf",
						"stbl",
						"stsd"
					])[0];
					const stsd = parseStsd(stsdBox);
					if (type) {
						result[trackId] = {
							timescale,
							type,
							stsd
						};
						result[type] = _objectSpread2({
							timescale,
							id: trackId
						}, stsd);
					} else result[trackId] = {
						timescale,
						type: hdlrType,
						stsd
					};
				}
			}
		}
	}
	findBox(initSegment, [
		"moov",
		"mvex",
		"trex"
	]).forEach((trex) => {
		const trackId = readUint32(trex, 4);
		const track = result[trackId];
		if (track) track.default = {
			duration: readUint32(trex, 12),
			sampleSize: readUint32(trex, 16),
			flags: readUint32(trex, 20)
		};
	});
	return result;
}
function parseStsd(stsd) {
	const sampleEntries = stsd.subarray(8);
	const sampleEntriesEnd = sampleEntries.subarray(86);
	const fourCC = bin2str(sampleEntries.subarray(4, 8));
	let codec = fourCC;
	let supplemental;
	const encrypted = fourCC === "enca" || fourCC === "encv";
	if (encrypted) findBox(findBox(sampleEntries, [fourCC])[0].subarray(fourCC === "enca" ? 28 : 78), ["sinf"]).forEach((sinf) => {
		const schm = findBox(sinf, ["schm"])[0];
		if (schm) {
			const scheme = bin2str(schm.subarray(4, 8));
			if (scheme === "cbcs" || scheme === "cenc") {
				const frma = findBox(sinf, ["frma"])[0];
				if (frma) codec = bin2str(frma);
			}
		}
	});
	const codecFourCC = codec;
	switch (codec) {
		case "avc1":
		case "avc2":
		case "avc3":
		case "avc4": {
			const avcCBox = findBox(sampleEntriesEnd, ["avcC"])[0];
			if (avcCBox && avcCBox.length > 3) {
				codec += "." + toHex(avcCBox[1]) + toHex(avcCBox[2]) + toHex(avcCBox[3]);
				supplemental = parseSupplementalDoViCodec(codecFourCC === "avc1" ? "dva1" : "dvav", sampleEntriesEnd);
			}
			break;
		}
		case "mp4a": {
			const codecBox = findBox(sampleEntries, [fourCC])[0];
			const esdsBox = findBox(codecBox.subarray(28), ["esds"])[0];
			if (esdsBox && esdsBox.length > 7) {
				let i = 4;
				if (esdsBox[i++] !== 3) break;
				i = skipBERInteger(esdsBox, i);
				i += 2;
				const flags = esdsBox[i++];
				if (flags & 128) i += 2;
				if (flags & 64) i += esdsBox[i++];
				if (esdsBox[i++] !== 4) break;
				i = skipBERInteger(esdsBox, i);
				const objectType = esdsBox[i++];
				if (objectType === 64) codec += "." + toHex(objectType);
				else break;
				i += 12;
				if (esdsBox[i++] !== 5) break;
				i = skipBERInteger(esdsBox, i);
				const firstByte = esdsBox[i++];
				let audioObjectType = (firstByte & 248) >> 3;
				if (audioObjectType === 31) audioObjectType += 1 + ((firstByte & 7) << 3) + ((esdsBox[i] & 224) >> 5);
				codec += "." + audioObjectType;
			}
			break;
		}
		case "hvc1":
		case "hev1": {
			const hvcCBox = findBox(sampleEntriesEnd, ["hvcC"])[0];
			if (hvcCBox && hvcCBox.length > 12) {
				const profileByte = hvcCBox[1];
				const profileSpace = [
					"",
					"A",
					"B",
					"C"
				][profileByte >> 6];
				const generalProfileIdc = profileByte & 31;
				const profileCompat = readUint32(hvcCBox, 2);
				const tierFlag = (profileByte & 32) >> 5 ? "H" : "L";
				const levelIDC = hvcCBox[12];
				const constraintIndicator = hvcCBox.subarray(6, 12);
				codec += "." + profileSpace + generalProfileIdc;
				codec += "." + reverse32BitInt(profileCompat).toString(16).toUpperCase();
				codec += "." + tierFlag + levelIDC;
				let constraintString = "";
				for (let i = constraintIndicator.length; i--;) {
					const byte = constraintIndicator[i];
					if (byte || constraintString) constraintString = "." + byte.toString(16).toUpperCase() + constraintString;
				}
				codec += constraintString;
			}
			supplemental = parseSupplementalDoViCodec(codecFourCC == "hev1" ? "dvhe" : "dvh1", sampleEntriesEnd);
			break;
		}
		case "dvh1":
		case "dvhe":
		case "dvav":
		case "dva1":
		case "dav1":
			codec = parseSupplementalDoViCodec(codec, sampleEntriesEnd) || codec;
			break;
		case "vp09": {
			const vpcCBox = findBox(sampleEntriesEnd, ["vpcC"])[0];
			if (vpcCBox && vpcCBox.length > 6) {
				const profile = vpcCBox[4];
				const level = vpcCBox[5];
				const bitDepth = vpcCBox[6] >> 4 & 15;
				codec += "." + addLeadingZero(profile) + "." + addLeadingZero(level) + "." + addLeadingZero(bitDepth);
			}
			break;
		}
		case "av01": {
			const av1CBox = findBox(sampleEntriesEnd, ["av1C"])[0];
			if (av1CBox && av1CBox.length > 2) {
				const profile = av1CBox[1] >>> 5;
				const level = av1CBox[1] & 31;
				const tierFlag = av1CBox[2] >>> 7 ? "H" : "M";
				const highBitDepth = (av1CBox[2] & 64) >> 6;
				const twelveBit = (av1CBox[2] & 32) >> 5;
				const bitDepth = profile === 2 && highBitDepth ? twelveBit ? 12 : 10 : highBitDepth ? 10 : 8;
				const monochrome = (av1CBox[2] & 16) >> 4;
				const chromaSubsamplingX = (av1CBox[2] & 8) >> 3;
				const chromaSubsamplingY = (av1CBox[2] & 4) >> 2;
				const chromaSamplePosition = av1CBox[2] & 3;
				codec += "." + profile + "." + addLeadingZero(level) + tierFlag + "." + addLeadingZero(bitDepth) + "." + monochrome + "." + chromaSubsamplingX + chromaSubsamplingY + chromaSamplePosition + "." + addLeadingZero(1) + "." + addLeadingZero(1) + "." + addLeadingZero(1) + ".0";
				supplemental = parseSupplementalDoViCodec("dav1", sampleEntriesEnd);
			}
			break;
		}
	}
	return {
		codec,
		encrypted,
		supplemental
	};
}
function parseSupplementalDoViCodec(fourCC, sampleEntriesEnd) {
	const dvvCResult = findBox(sampleEntriesEnd, ["dvvC"]);
	const dvXCBox = dvvCResult.length ? dvvCResult[0] : findBox(sampleEntriesEnd, ["dvcC"])[0];
	if (dvXCBox) {
		const doViProfile = dvXCBox[2] >> 1 & 127;
		const doViLevel = dvXCBox[2] << 5 & 32 | dvXCBox[3] >> 3 & 31;
		return fourCC + "." + addLeadingZero(doViProfile) + "." + addLeadingZero(doViLevel);
	}
}
function reverse32BitInt(val) {
	let result = 0;
	for (let i = 0; i < 32; i++) result |= (val >> i & 1) << 31 - i;
	return result >>> 0;
}
function skipBERInteger(bytes, i) {
	const limit = i + 5;
	while (bytes[i++] & 128 && i < limit);
	return i;
}
function toHex(x) {
	return ("0" + x.toString(16).toUpperCase()).slice(-2);
}
function addLeadingZero(num) {
	return (num < 10 ? "0" : "") + num;
}
function patchEncyptionData(initSegment, decryptdata) {
	if (!initSegment || !decryptdata) return;
	const keyId = decryptdata.keyId;
	if ((keyId == null ? void 0 : keyId.byteLength) === 16 && decryptdata.isCommonEncryption) applyToTencBoxes(initSegment, (tenc, isAudio) => {
		const tencKeyId = tenc.subarray(8, 24);
		if (!tencKeyId.some((b) => b !== 0)) {
			logger.log(`[eme] Patching keyId in 'enc${isAudio ? "a" : "v"}>sinf>>tenc' box: ${arrayToHex(tencKeyId)} -> ${arrayToHex(keyId)}`);
			tenc.set(keyId, 8);
		}
	});
}
function parseKeyIdsFromTenc(initSegment) {
	const keyIds = [];
	applyToTencBoxes(initSegment, (tenc) => keyIds.push(tenc.subarray(8, 24)));
	return keyIds;
}
function applyToTencBoxes(initSegment, predicate) {
	findBox(initSegment, ["moov", "trak"]).forEach((trak) => {
		const stsd = findBox(trak, [
			"mdia",
			"minf",
			"stbl",
			"stsd"
		])[0];
		if (!stsd) return;
		const sampleEntries = stsd.subarray(8);
		let encBoxes = findBox(sampleEntries, ["enca"]);
		const isAudio = encBoxes.length > 0;
		if (!isAudio) encBoxes = findBox(sampleEntries, ["encv"]);
		encBoxes.forEach((enc) => {
			findBox(isAudio ? enc.subarray(28) : enc.subarray(78), ["sinf"]).forEach((sinf) => {
				const tenc = parseSinf(sinf);
				if (tenc) predicate(tenc, isAudio);
			});
		});
	});
}
function parseSinf(sinf) {
	const schm = findBox(sinf, ["schm"])[0];
	if (schm) {
		const scheme = bin2str(schm.subarray(4, 8));
		if (scheme === "cbcs" || scheme === "cenc") {
			const tenc = findBox(sinf, ["schi", "tenc"])[0];
			if (tenc) return tenc;
		}
	}
}
var utf8TextDecoder;
function decodeUtf8UserData(data) {
	if (typeof TextDecoder === "undefined") return utf8ArrayToStr(data);
	return (utf8TextDecoder || (utf8TextDecoder = new TextDecoder("utf-8"))).decode(data).replace(/\0/g, "");
}
function findMoofTrafs(data) {
	const end = data.byteLength;
	const trafs = [];
	for (let i = 0; i < end;) {
		const hasHeader = i + 8 <= end;
		const size = i + 4 <= end ? data[i] * 16777216 + (data[i + 1] << 16 | data[i + 2] << 8 | data[i + 3]) : readUint32(data, i);
		const endbox = size > 1 ? i + size : end;
		if (hasHeader && data[i + 4] === 109 && data[i + 5] === 111 && data[i + 6] === 111 && data[i + 7] === 102) {
			const moofEnd = Math.min(endbox, end);
			for (let j = i + 8; j < moofEnd;) {
				const childHasHeader = j + 8 <= moofEnd;
				const childSize = j + 4 <= moofEnd ? data[j] * 16777216 + (data[j + 1] << 16 | data[j + 2] << 8 | data[j + 3]) : readUint32(data, j);
				const childEndbox = childSize > 1 ? j + childSize : moofEnd;
				if (childHasHeader && data[j + 4] === 116 && data[j + 5] === 114 && data[j + 6] === 97 && data[j + 7] === 102) {
					const trafEnd = Math.min(childEndbox, moofEnd);
					let tfdt;
					let tfhd;
					const truns = [];
					for (let k = j + 8; k < trafEnd;) {
						const boxHasHeader = k + 8 <= trafEnd;
						const boxSize = k + 4 <= trafEnd ? data[k] * 16777216 + (data[k + 1] << 16 | data[k + 2] << 8 | data[k + 3]) : readUint32(data, k);
						const boxEnd = boxSize > 1 ? k + boxSize : trafEnd;
						if (boxHasHeader && data[k + 4] === 116) {
							const payloadEnd = Math.min(boxEnd, trafEnd);
							if (data[k + 5] === 102 && data[k + 6] === 104 && data[k + 7] === 100) tfhd || (tfhd = data.subarray(k + 8, payloadEnd));
							else if (data[k + 5] === 102 && data[k + 6] === 100 && data[k + 7] === 116) tfdt || (tfdt = data.subarray(k + 8, payloadEnd));
							else if (data[k + 5] === 114 && data[k + 6] === 117 && data[k + 7] === 110) truns.push(data.subarray(k + 8, payloadEnd));
						}
						k = boxEnd;
					}
					trafs.push({
						moofOffset: data.byteOffset + i,
						tfdt,
						tfhd,
						truns
					});
				}
				j = childEndbox;
			}
		}
		i = endbox;
	}
	return trafs;
}
function getSampleData(data, initData, chunkMeta, logger, includeSampleDetails = true) {
	return parseSampleData(data, initData, logger, includeSampleDetails);
}
function parseSamplesAndTiming(timeOffset, track, initData, logger, includeSampleDetails = false) {
	const samples = [];
	const data = track.samples;
	return {
		samples,
		sampleData: {
			includeSampleDetails,
			tracks: parseSampleData(data, initData, logger, includeSampleDetails, {
				isHEVCFlavor: isHEVC(track.codec),
				samples,
				timeOffset,
				timescale: track.timescale,
				trackId: track.id
			})
		}
	};
}
function parseSampleData(data, initData, logger, includeSampleDetails, seiContext) {
	const tracks = {};
	let hasTrackDuration = false;
	const trafs = findMoofTrafs(data);
	const eof = data.byteLength;
	for (let i = 0; i < trafs.length; i++) {
		const { moofOffset, tfdt, tfhd, truns } = trafs[i];
		const id = readUint32(tfhd, 4);
		const track = initData[id];
		if (!track) continue;
		const trackTimes = tracks[id] || (tracks[id] = {
			start: NaN,
			duration: 0,
			sampleCount: 0,
			trun: [],
			timescale: track.timescale,
			type: track.type
		});
		let baseTime;
		if (tfdt) {
			const version = tfdt[0];
			baseTime = readUint32(tfdt, 4);
			if (version === 1) {
				if (baseTime === UINT32_MAX) logger.warn(`[mp4-demuxer]: Ignoring assumed invalid signed 64-bit track fragment decode time`);
				else {
					baseTime *= UINT32_MAX + 1;
					baseTime += readUint32(tfdt, 8);
				}
			}
			if (isFiniteNumber(baseTime) && (!isFiniteNumber(trackTimes.start) || baseTime < trackTimes.start)) trackTimes.start = baseTime;
			if (seiContext && isFiniteNumber(baseTime)) seiContext.timeOffset = baseTime / seiContext.timescale;
		}
		const scanSei = (seiContext == null ? void 0 : seiContext.trackId) === id && track.type === ElementaryStreamTypes.VIDEO;
		const trackDefault = track.default;
		const tfhdFlags = readUint32(tfhd, 0) & 16777215;
		let defaultSampleDuration = (trackDefault == null ? void 0 : trackDefault.duration) || 0;
		let defaultSampleDurationOffset;
		let defaultSampleSize = (trackDefault == null ? void 0 : trackDefault.sampleSize) || 0;
		let tfhdOptOffset = 8;
		if (tfhdFlags & 1) tfhdOptOffset += 8;
		if (tfhdFlags & 2) tfhdOptOffset += 4;
		if (tfhdFlags & 8) {
			defaultSampleDuration = readUint32(tfhd, tfhdOptOffset);
			defaultSampleDurationOffset = tfhd.byteOffset - data.byteOffset + tfhdOptOffset;
			tfhdOptOffset += 4;
		}
		if (tfhdFlags & 16) defaultSampleSize = readUint32(tfhd, tfhdOptOffset);
		let baseDataOffset = 0;
		const baseDataOffsetPresent = (tfhdFlags & 1) !== 0;
		const defaultBaseIsMoof = !baseDataOffsetPresent && (tfhdFlags & 131072) !== 0;
		if (baseDataOffsetPresent) {
			baseDataOffset = readUint32(tfhd, 8);
			baseDataOffset *= Math.pow(2, 32);
			baseDataOffset += readUint32(tfhd, 12);
		} else if (defaultBaseIsMoof) baseDataOffset = moofOffset;
		let sampleDTS = baseTime || 0;
		let rawDuration = 0;
		let sampleDuration = defaultSampleDuration;
		for (let j = 0; j < truns.length; j++) {
			const trun = truns[j];
			const sampleCount = readUint32(trun, 4);
			const sampleIndex = trackTimes.sampleCount;
			trackTimes.sampleCount += sampleCount;
			const dataOffsetPresent = trun[3] & 1;
			let dataOffset = 0;
			const firstSampleFlagsPresent = trun[3] & 4;
			const sampleDurationPresent = trun[2] & 1;
			const sampleSizePresent = trun[2] & 2;
			const sampleFlagsPresent = trun[2] & 4;
			const sampleCompositionTimeOffsetPresent = trun[2] & 8;
			let offset = 8;
			if (dataOffsetPresent) {
				dataOffset = readSint32(trun, offset);
				offset += 4;
			}
			if (firstSampleFlagsPresent) {
				if (!(trun[offset + 1] & 1) && trackTimes.keyFrameIndex === void 0) trackTimes.keyFrameIndex = sampleIndex;
				offset += 4;
			}
			let sampleOffset = baseDataOffset + dataOffset;
			if (!includeSampleDetails && trun[1] === 0 && trun[2] === 6 && trun[3] === 1) {
				var _seiContext$timeOffse, _seiContext$timescale;
				const runStartDTS = sampleDTS;
				const runStartOffset = sampleOffset;
				const trunSamplesOffset = offset;
				let firstSyncSample = -1;
				let firstSyncSampleEnd = 0;
				let fittingSampleCount = 0;
				let seiTimeOffset = (_seiContext$timeOffse = seiContext == null ? void 0 : seiContext.timeOffset) != null ? _seiContext$timeOffse : 0;
				const seiSampleDuration = defaultSampleDuration / ((_seiContext$timescale = seiContext == null ? void 0 : seiContext.timescale) != null ? _seiContext$timescale : 1);
				const hevcSei = (seiContext == null ? void 0 : seiContext.isHEVCFlavor) === true;
				const seiHeaderSize = hevcSei ? 2 : 1;
				for (let ix = 0; ix < sampleCount; ix++) {
					const _size = trun[offset] === 0 ? trun[offset + 1] << 16 | trun[offset + 2] << 8 | trun[offset + 3] : readUint32(trun, offset);
					const isFirstSyncSample = firstSyncSample === -1 && trackTimes.keyFrameIndex === void 0 && (trun[offset + 5] & 1) === 0;
					offset += 8;
					const sampleEnd = sampleOffset + _size;
					if (scanSei) {
						if (_size > 0) {
							let naluOffset = sampleOffset;
							do {
								const naluSize = data[naluOffset] === 0 ? data[naluOffset + 1] << 16 | data[naluOffset + 2] << 8 | data[naluOffset + 3] : readUint32(data, naluOffset);
								naluOffset += 4;
								const naluHeader = data[naluOffset];
								const naluType = hevcSei ? naluHeader >> 1 & 63 : naluHeader & 31;
								if (hevcSei ? naluType === 39 || naluType === 40 : naluType === 6) parseSEIMessageFromNALu(data.subarray(naluOffset, naluOffset + naluSize), seiHeaderSize, seiTimeOffset, seiContext.samples);
								naluOffset += naluSize;
							} while (naluOffset < sampleEnd);
						}
						seiTimeOffset += seiSampleDuration;
					}
					sampleOffset = sampleEnd;
					if (isFirstSyncSample) {
						firstSyncSample = ix;
						firstSyncSampleEnd = sampleOffset;
					}
				}
				if (sampleOffset <= eof) fittingSampleCount = sampleCount;
				else {
					let fittingOffset = runStartOffset;
					let fittingTrunOffset = trunSamplesOffset;
					for (let ix = 0; ix < sampleCount; ix++) {
						const _size2 = trun[fittingTrunOffset] === 0 ? trun[fittingTrunOffset + 1] << 16 | trun[fittingTrunOffset + 2] << 8 | trun[fittingTrunOffset + 3] : readUint32(trun, fittingTrunOffset);
						fittingOffset += _size2;
						if (fittingOffset > eof) break;
						fittingSampleCount = ix + 1;
						fittingTrunOffset += 8;
					}
				}
				if (scanSei) seiContext.timeOffset = seiTimeOffset;
				if (firstSyncSample !== -1 && firstSyncSampleEnd <= eof && trackTimes.keyFrameIndex === void 0) {
					trackTimes.keyFrameIndex = firstSyncSample;
					trackTimes.keyFrameStart = runStartDTS + firstSyncSample * defaultSampleDuration;
				}
				if (fittingSampleCount) {
					if (!isFiniteNumber(trackTimes.ptsMin) || runStartDTS < trackTimes.ptsMin) trackTimes.ptsMin = runStartDTS;
					const lastSampleEnd = runStartDTS + fittingSampleCount * defaultSampleDuration;
					if (!isFiniteNumber(trackTimes.ptsMax) || lastSampleEnd > trackTimes.ptsMax) trackTimes.ptsMax = lastSampleEnd;
				}
				const runDuration = defaultSampleDuration * sampleCount;
				sampleDTS = runStartDTS + runDuration;
				rawDuration += runDuration;
				continue;
			}
			let samples;
			let fragRun;
			if (includeSampleDetails) {
				samples = [];
				fragRun = {
					sampleOffset,
					samples,
					defaultSampleDurationOffset
				};
				if (sampleOffset <= eof) trackTimes.trun.push(fragRun);
			}
			let size;
			for (let ix = 0; ix < sampleCount; ix++) {
				let thisSampleDurationOffset;
				if (sampleDurationPresent) {
					if (includeSampleDetails) thisSampleDurationOffset = trun.byteOffset - data.byteOffset + offset;
					sampleDuration = readUint32(trun, offset);
					offset += 4;
				} else sampleDuration = defaultSampleDuration;
				if (sampleSizePresent) {
					size = readUint32(trun, offset);
					offset += 4;
				} else size = defaultSampleSize;
				let flags;
				let isNonSyncSample;
				if (sampleFlagsPresent) {
					isNonSyncSample = trun[offset + 1] & 1 ? 1 : 0;
					if (includeSampleDetails) flags = {
						isNonSync: isNonSyncSample,
						dependsOn: (trun[offset] & 3) === 1 ? 1 : 2
					};
					offset += 4;
				}
				let cts = 0;
				if (sampleCompositionTimeOffsetPresent) {
					cts = trun[0] === 0 ? readUint32(trun, offset) : readSint32(trun, offset);
					offset += 4;
				}
				if (scanSei) {
					let naluOffset = sampleOffset;
					let naluTotalSize = 0;
					while (naluTotalSize < size) {
						const naluSize = readUint32(data, naluOffset);
						naluOffset += 4;
						if (isSEIMessage(seiContext.isHEVCFlavor, data[naluOffset])) parseSEIMessageFromNALu(data.subarray(naluOffset, naluOffset + naluSize), seiContext.isHEVCFlavor ? 2 : 1, seiContext.timeOffset + cts / seiContext.timescale, seiContext.samples);
						naluOffset += naluSize;
						naluTotalSize += naluSize + 4;
					}
					seiContext.timeOffset += sampleDuration / seiContext.timescale;
				}
				sampleOffset += size;
				if (sampleOffset <= eof) {
					if (fragRun && thisSampleDurationOffset !== void 0) fragRun.lastSampleDurationOffset = thisSampleDurationOffset;
					if (isNonSyncSample === 0 && trackTimes.keyFrameIndex === void 0) {
						trackTimes.keyFrameIndex = ix;
						trackTimes.keyFrameStart = sampleDTS;
					}
					const pts = sampleDTS + cts;
					if (!isFiniteNumber(trackTimes.ptsMin) || pts < trackTimes.ptsMin) trackTimes.ptsMin = pts;
					if (!isFiniteNumber(trackTimes.ptsMax) || pts + sampleDuration > trackTimes.ptsMax) trackTimes.ptsMax = pts + sampleDuration;
					if (samples) samples[ix] = {
						cts,
						duration: sampleDuration,
						flags,
						size
					};
				}
				sampleDTS += sampleDuration;
				rawDuration += sampleDuration;
			}
			if (!rawDuration && defaultSampleDuration) rawDuration += defaultSampleDuration * sampleCount;
		}
		trackTimes.duration += rawDuration;
		if (trackTimes.duration) hasTrackDuration = true;
	}
	if (!hasTrackDuration) {
		let sidxMinStart = Infinity;
		let sidxMaxEnd = 0;
		const sidxs = findBox(data, ["sidx"]);
		for (let i = 0; i < sidxs.length; i++) {
			const sidx = parseSegmentIndex(sidxs[i]);
			if (sidx != null && sidx.references) {
				sidxMinStart = Math.min(sidxMinStart, sidx.earliestPresentationTime / sidx.timescale);
				const subSegmentDuration = sidx.references.reduce((dur, ref) => dur + ref.info.duration || 0, 0);
				sidxMaxEnd = Math.max(sidxMaxEnd, subSegmentDuration + sidx.earliestPresentationTime / sidx.timescale);
			}
		}
		if (sidxMaxEnd && isFiniteNumber(sidxMaxEnd)) Object.keys(tracks).forEach((trackId) => {
			if (!tracks[trackId].duration) tracks[trackId].duration = sidxMaxEnd * tracks[trackId].timescale - tracks[trackId].start;
		});
	}
	return tracks;
}
function segmentValidRange(data) {
	const segmentedRange = {
		valid: null,
		remainder: null
	};
	const moofs = findBox(data, ["moof"]);
	if (moofs.length < 2) {
		segmentedRange.remainder = data;
		return segmentedRange;
	}
	const last = moofs[moofs.length - 1];
	segmentedRange.valid = data.slice(0, last.byteOffset - 8);
	segmentedRange.remainder = data.slice(last.byteOffset - 8);
	return segmentedRange;
}
function appendUint8Array(data1, data2) {
	const temp = new Uint8Array(data1.length + data2.length);
	temp.set(data1);
	temp.set(data2, data1.length);
	return temp;
}
function parseSamples(timeOffset, track) {
	const seiSamples = [];
	const videoData = track.samples;
	const timescale = track.timescale;
	const trackId = track.id;
	let isHEVCFlavor = false;
	findBox(videoData, ["moof"]).map((moof) => {
		const moofOffset = moof.byteOffset - 8;
		findBox(moof, ["traf"]).map((traf) => {
			const baseTime = findBox(traf, ["tfdt"]).map((tfdt) => {
				const version = tfdt[0];
				let result = readUint32(tfdt, 4);
				if (version === 1) {
					result *= Math.pow(2, 32);
					result += readUint32(tfdt, 8);
				}
				return result / timescale;
			})[0];
			if (baseTime !== void 0) timeOffset = baseTime;
			return findBox(traf, ["tfhd"]).map((tfhd) => {
				const id = readUint32(tfhd, 4);
				const tfhdFlags = readUint32(tfhd, 0) & 16777215;
				const baseDataOffsetPresent = (tfhdFlags & 1) !== 0;
				let baseDataOffset = 0;
				const sampleDescriptionIndexPresent = (tfhdFlags & 2) !== 0;
				const defaultSampleDurationPresent = (tfhdFlags & 8) !== 0;
				let defaultSampleDuration = 0;
				const defaultSampleSizePresent = (tfhdFlags & 16) !== 0;
				let defaultSampleSize = 0;
				const defaultSampleFlagsPresent = (tfhdFlags & 32) !== 0;
				const defaultBaseIsMoof = !baseDataOffsetPresent && (tfhdFlags & 131072) !== 0;
				let tfhdOffset = 8;
				if (id === trackId) {
					if (baseDataOffsetPresent) {
						baseDataOffset = readUint32(tfhd, tfhdOffset);
						tfhdOffset += 4;
						baseDataOffset *= Math.pow(2, 32);
						baseDataOffset += readUint32(tfhd, tfhdOffset);
						tfhdOffset += 4;
					} else if (defaultBaseIsMoof) baseDataOffset = moofOffset;
					if (sampleDescriptionIndexPresent) tfhdOffset += 4;
					if (defaultSampleDurationPresent) {
						defaultSampleDuration = readUint32(tfhd, tfhdOffset);
						tfhdOffset += 4;
					}
					if (defaultSampleSizePresent) {
						defaultSampleSize = readUint32(tfhd, tfhdOffset);
						tfhdOffset += 4;
					}
					if (defaultSampleFlagsPresent) tfhdOffset += 4;
					if (track.type === "video") isHEVCFlavor = isHEVC(track.codec);
					findBox(traf, ["trun"]).map((trun) => {
						const version = trun[0];
						const flags = readUint32(trun, 0) & 16777215;
						const dataOffsetPresent = (flags & 1) !== 0;
						let dataOffset = 0;
						const firstSampleFlagsPresent = (flags & 4) !== 0;
						const sampleDurationPresent = (flags & 256) !== 0;
						let sampleDuration = 0;
						const sampleSizePresent = (flags & 512) !== 0;
						let sampleSize = 0;
						const sampleFlagsPresent = (flags & 1024) !== 0;
						const sampleCompositionOffsetsPresent = (flags & 2048) !== 0;
						let compositionOffset = 0;
						const sampleCount = readUint32(trun, 4);
						let trunOffset = 8;
						if (dataOffsetPresent) {
							dataOffset = readUint32(trun, trunOffset);
							trunOffset += 4;
						}
						if (firstSampleFlagsPresent) trunOffset += 4;
						let sampleOffset = baseDataOffset + dataOffset;
						for (let ix = 0; ix < sampleCount; ix++) {
							if (sampleDurationPresent) {
								sampleDuration = readUint32(trun, trunOffset);
								trunOffset += 4;
							} else sampleDuration = defaultSampleDuration;
							if (sampleSizePresent) {
								sampleSize = readUint32(trun, trunOffset);
								trunOffset += 4;
							} else sampleSize = defaultSampleSize;
							if (sampleFlagsPresent) trunOffset += 4;
							if (sampleCompositionOffsetsPresent) {
								if (version === 0) compositionOffset = readUint32(trun, trunOffset);
								else compositionOffset = readSint32(trun, trunOffset);
								trunOffset += 4;
							}
							if (track.type === ElementaryStreamTypes.VIDEO) {
								let naluTotalSize = 0;
								while (naluTotalSize < sampleSize) {
									const naluSize = readUint32(videoData, sampleOffset);
									sampleOffset += 4;
									if (isSEIMessage(isHEVCFlavor, videoData[sampleOffset])) parseSEIMessageFromNALu(videoData.subarray(sampleOffset, sampleOffset + naluSize), isHEVCFlavor ? 2 : 1, timeOffset + compositionOffset / timescale, seiSamples);
									sampleOffset += naluSize;
									naluTotalSize += naluSize + 4;
								}
							}
							timeOffset += sampleDuration / timescale;
						}
					});
				}
			});
		});
	});
	return seiSamples;
}
function isHEVC(codec) {
	if (!codec) return false;
	const baseCodec = codec.substring(0, 4);
	return baseCodec === "hvc1" || baseCodec === "hev1" || baseCodec === "dvh1" || baseCodec === "dvhe";
}
function isSEIMessage(isHEVCFlavor, naluHeader) {
	if (isHEVCFlavor) {
		const naluType = naluHeader >> 1 & 63;
		return naluType === 39 || naluType === 40;
	} else return (naluHeader & 31) === 6;
}
function parseSEIMessageFromNALu(unescapedData, headerSize, pts, samples) {
	const data = discardEPB(unescapedData);
	let seiPtr = 0;
	seiPtr += headerSize;
	let payloadType = 0;
	let payloadSize = 0;
	let b = 0;
	while (seiPtr < data.length) {
		payloadType = 0;
		do {
			if (seiPtr >= data.length) break;
			b = data[seiPtr++];
			payloadType += b;
		} while (b === 255);
		payloadSize = 0;
		do {
			if (seiPtr >= data.length) break;
			b = data[seiPtr++];
			payloadSize += b;
		} while (b === 255);
		const leftOver = data.length - seiPtr;
		let payPtr = seiPtr;
		if (payloadSize < leftOver) seiPtr += payloadSize;
		else if (payloadSize > leftOver) {
			logger.error(`Malformed SEI payload. ${payloadSize} is too small, only ${leftOver} bytes left to parse.`);
			break;
		}
		if (payloadType === 4) {
			if (data[payPtr++] === 181) {
				const providerCode = readUint16(data, payPtr);
				payPtr += 2;
				if (providerCode === 49) {
					const userStructure = readUint32(data, payPtr);
					payPtr += 4;
					if (userStructure === 1195456820) {
						const userDataType = data[payPtr++];
						if (userDataType === 3) {
							const firstByte = data[payPtr++];
							const totalCCs = 31 & firstByte;
							const enabled = 64 & firstByte;
							const totalBytes = enabled ? 2 + totalCCs * 3 : 0;
							const byteArray = new Uint8Array(totalBytes);
							if (enabled) {
								byteArray[0] = firstByte;
								for (let i = 1; i < totalBytes; i++) byteArray[i] = data[payPtr++];
							}
							samples.push({
								type: userDataType,
								payloadType,
								pts,
								bytes: byteArray
							});
						}
					}
				}
			}
		} else if (payloadType === 5) {
			if (payloadSize > 16) {
				const uuidStrArray = [];
				for (let i = 0; i < 16; i++) {
					const _b = data[payPtr++].toString(16);
					uuidStrArray.push(_b.length == 1 ? "0" + _b : _b);
					if (i === 3 || i === 5 || i === 7 || i === 9) uuidStrArray.push("-");
				}
				const length = payloadSize - 16;
				const userDataBytes = new Uint8Array(length);
				for (let i = 0; i < length; i++) userDataBytes[i] = data[payPtr++];
				samples.push({
					payloadType,
					pts,
					uuid: uuidStrArray.join(""),
					userData: decodeUtf8UserData(userDataBytes),
					userDataBytes
				});
			}
		}
	}
}
/**
* remove Emulation Prevention bytes from a RBSP
*/
function discardEPB(data) {
	const length = data.byteLength;
	let epbPositions;
	let position = data.indexOf(3, 3);
	while (position !== -1) {
		if (data[position - 1] === 0 && data[position - 2] === 0) (epbPositions || (epbPositions = [])).push(position);
		position = data.indexOf(3, position + 1);
	}
	if (!epbPositions) return data;
	const newLength = length - epbPositions.length;
	const newData = new Uint8Array(newLength);
	let epbIndex = 0;
	let sourceIndex = 0;
	for (let i = 0; i < newLength; sourceIndex++, i++) {
		if (sourceIndex === epbPositions[epbIndex]) {
			sourceIndex++;
			epbIndex++;
		}
		newData[i] = data[sourceIndex];
	}
	return newData;
}
function parseEmsg(data) {
	const version = data[0];
	let schemeIdUri = "";
	let value = "";
	let timeScale = 0;
	let presentationTimeDelta = 0;
	let presentationTime;
	let eventDuration = 0;
	let id = 0;
	let offset = 4;
	if (version === 0) {
		const scheme = readCString(data, offset);
		const schemeValue = scheme !== null ? readCString(data, offset + scheme.length) : null;
		if (scheme !== null && schemeValue !== null) {
			schemeIdUri = scheme;
			value = schemeValue;
			offset += scheme.length + schemeValue.length;
			timeScale = readUint32(data, offset);
			offset += 4;
			presentationTimeDelta = readUint32(data, offset);
			offset += 4;
			eventDuration = readUint32(data, offset);
			offset += 4;
			id = readUint32(data, offset);
			offset += 4;
		} else {
			logger.warn(`Unterminated ${scheme === null ? "scheme_id_uri" : "value"} in parsing emsg box: version 0 box ends inside a string, dropping all of its fields`);
			offset = data.length;
		}
	} else if (version === 1) {
		timeScale = readUint32(data, offset);
		offset += 4;
		const leftPresentationTime = readUint32(data, offset);
		offset += 4;
		const rightPresentationTime = readUint32(data, offset);
		offset += 4;
		presentationTime = 2 ** 32 * leftPresentationTime + rightPresentationTime;
		if (!isSafeInteger(presentationTime)) {
			presentationTime = Number.MAX_SAFE_INTEGER;
			logger.warn("Presentation time exceeds safe integer limit and wrapped to max safe integer in parsing emsg box");
		}
		eventDuration = readUint32(data, offset);
		offset += 4;
		id = readUint32(data, offset);
		offset += 4;
		const scheme = readCString(data, offset);
		const schemeValue = scheme !== null ? readCString(data, offset + scheme.length) : null;
		if (scheme !== null) {
			schemeIdUri = scheme;
			offset += scheme.length;
		}
		if (schemeValue !== null) {
			value = schemeValue;
			offset += schemeValue.length;
		} else {
			logger.warn(`Unterminated ${scheme === null ? "scheme_id_uri" : "value"} in parsing emsg box: version 1 box ends inside a string, dropping its ${scheme === null ? "strings and payload" : "value and payload"}`);
			offset = data.length;
		}
	}
	const payload = data.subarray(offset, data.byteLength);
	return {
		schemeIdUri,
		value,
		timeScale,
		presentationTime,
		presentationTimeDelta,
		eventDuration,
		id,
		payload
	};
}
var ua = getNavigator("userAgent");
getNavigator("vendor");
var chromeVersion;
var firefoxVersion;
var safariVersion;
function getNavigator(field) {
	try {
		return navigator[field] || "";
	} catch (e) {}
	return "";
}
function userAgentSafariVersion() {
	if (safariVersion === void 0) {
		const result = ua.match(/Safari\/(\d+)/i);
		safariVersion = result ? parseInt(result[1]) : 0;
	}
	return safariVersion;
}
function userAgentChromeVersion() {
	if (chromeVersion === void 0) {
		const result = ua.match(/Chrome\/(\d+)/i);
		chromeVersion = result ? parseInt(result[1]) : 0;
	}
	return chromeVersion;
}
function userAgentFirefoxVersion() {
	if (firefoxVersion === void 0) {
		const result = ua.match(/Firefox\/(\d+)/i);
		firefoxVersion = result ? parseInt(result[1]) : 0;
	}
	return firefoxVersion;
}
function userAgentHevcSupportIsInaccurate() {
	return /\(Windows.+Firefox\//i.test(ua);
}
function userAgentIsAndroidLike() {
	return /Android/.test(ua);
}
var sampleEntryCodesISO = {
	audio: {
		a3ds: 1,
		"ac-3": .95,
		"ac-4": 1,
		alac: .9,
		alaw: 1,
		dra1: 1,
		"dts+": 1,
		"dts-": 1,
		dtsc: 1,
		dtse: 1,
		dtsh: 1,
		"ec-3": .9,
		enca: 1,
		fLaC: .9,
		flac: .9,
		FLAC: .9,
		g719: 1,
		g726: 1,
		m4ae: 1,
		mha1: 1,
		mha2: 1,
		mhm1: 1,
		mhm2: 1,
		mlpa: 1,
		mp4a: 1,
		"raw ": 1,
		Opus: 1,
		opus: 1,
		samr: 1,
		sawb: 1,
		sawp: 1,
		sevc: 1,
		sqcp: 1,
		ssmv: 1,
		twos: 1,
		ulaw: 1
	},
	video: {
		avc1: 1,
		avc2: 1,
		avc3: 1,
		avc4: 1,
		avcp: 1,
		av01: .8,
		dav1: .8,
		drac: 1,
		dva1: 1,
		dvav: 1,
		dvh1: .7,
		dvhe: .7,
		encv: 1,
		hev1: .75,
		hvc1: .75,
		mjp2: 1,
		mp4v: 1,
		mvc1: 1,
		mvc2: 1,
		mvc3: 1,
		mvc4: 1,
		resv: 1,
		rv60: 1,
		s263: 1,
		svc1: 1,
		svc2: 1,
		"vc-1": 1,
		vp08: 1,
		vp09: .9
	},
	text: {
		stpp: 1,
		wvtt: 1
	},
	image: { mjpg: 1 }
};
function isCodecType(codec, type) {
	const typeCodes = sampleEntryCodesISO[type];
	return !!typeCodes && !!typeCodes[codec.slice(0, 4)];
}
function areCodecsMediaSourceSupported(codecs, type, preferManagedMediaSource = true) {
	return !codecs.split(",").some((codec) => !isCodecMediaSourceSupported(codec, type, preferManagedMediaSource));
}
function isCodecMediaSourceSupported(codec, type, preferManagedMediaSource = true) {
	var _MediaSource$isTypeSu;
	const MediaSource = getMediaSource(preferManagedMediaSource);
	return (_MediaSource$isTypeSu = MediaSource == null ? void 0 : MediaSource.isTypeSupported(mimeTypeForCodec(codec, type))) != null ? _MediaSource$isTypeSu : false;
}
function mimeTypeForCodec(codec, type) {
	return `${type}/mp4;codecs=${codec}`;
}
function videoCodecPreferenceValue(videoCodec) {
	if (videoCodec) {
		const fourCC = videoCodec.substring(0, 4);
		return sampleEntryCodesISO.video[fourCC];
	}
	return 2;
}
function codecsSetSelectionPreferenceValue(codecSet) {
	const limitedHevcSupport = userAgentHevcSupportIsInaccurate();
	return codecSet.split(",").reduce((num, fourCC) => {
		const preferenceValue = limitedHevcSupport && isHEVC(fourCC) ? 9 : sampleEntryCodesISO.video[fourCC];
		if (preferenceValue) return (preferenceValue * 2 + num) / (num ? 3 : 2);
		return (sampleEntryCodesISO.audio[fourCC] + num) / (num ? 2 : 1);
	}, 0);
}
var CODEC_COMPATIBLE_NAMES = {};
function getCodecCompatibleNameLower(lowerCaseCodec, preferManagedMediaSource = true) {
	if (CODEC_COMPATIBLE_NAMES[lowerCaseCodec]) return CODEC_COMPATIBLE_NAMES[lowerCaseCodec];
	const codecsToCheck = {
		flac: [
			"flac",
			"fLaC",
			"FLAC"
		],
		opus: ["opus", "Opus"],
		"mp4a.40.34": ["mp3"]
	}[lowerCaseCodec];
	for (let i = 0; i < codecsToCheck.length; i++) {
		var _getMediaSource;
		if (isCodecMediaSourceSupported(codecsToCheck[i], "audio", preferManagedMediaSource)) {
			CODEC_COMPATIBLE_NAMES[lowerCaseCodec] = codecsToCheck[i];
			return codecsToCheck[i];
		} else if (codecsToCheck[i] === "mp3" && (_getMediaSource = getMediaSource(preferManagedMediaSource)) != null && _getMediaSource.isTypeSupported("audio/mpeg")) return "";
	}
	return lowerCaseCodec;
}
var AUDIO_CODEC_REGEXP = /flac|opus|mp4a\.40\.34/i;
function getCodecCompatibleName(codec, preferManagedMediaSource = true) {
	return codec.replace(AUDIO_CODEC_REGEXP, (m) => getCodecCompatibleNameLower(m.toLowerCase(), preferManagedMediaSource));
}
function replaceVideoCodec(originalCodecs, newVideoCodec) {
	const codecs = [];
	if (originalCodecs) {
		const allCodecs = originalCodecs.split(",");
		for (let i = 0; i < allCodecs.length; i++) if (!isCodecType(allCodecs[i], "video")) codecs.push(allCodecs[i]);
	}
	if (newVideoCodec) codecs.push(newVideoCodec);
	return codecs.join(",");
}
function pickMostCompleteCodecName(parsedCodec, levelCodec) {
	if (parsedCodec && (parsedCodec.length > 4 || [
		"ac-3",
		"ec-3",
		"alac",
		"fLaC",
		"Opus"
	].indexOf(parsedCodec) !== -1)) {
		if (isCodecSupportedAsType(parsedCodec, "audio") || isCodecSupportedAsType(parsedCodec, "video")) return parsedCodec;
	}
	if (levelCodec) {
		const levelCodecs = levelCodec.split(",");
		if (levelCodecs.length > 1) {
			if (parsedCodec) {
				for (let i = levelCodecs.length; i--;) if (levelCodecs[i].substring(0, 4) === parsedCodec.substring(0, 4)) return levelCodecs[i];
			}
			return levelCodecs[0];
		}
	}
	return levelCodec || parsedCodec;
}
function isCodecSupportedAsType(codec, type) {
	return isCodecType(codec, type) && isCodecMediaSourceSupported(codec, type);
}
function convertAVC1ToAVCOTI(videoCodecs) {
	const codecs = videoCodecs.split(",");
	for (let i = 0; i < codecs.length; i++) {
		const avcdata = codecs[i].split(".");
		if (avcdata.length > 2 && avcdata[0] === "avc1") codecs[i] = `avc1.${parseInt(avcdata[1]).toString(16)}${("000" + parseInt(avcdata[2]).toString(16)).slice(-4)}`;
	}
	return codecs.join(",");
}
function getM2TSSupportedAudioTypes(preferManagedMediaSource) {
	const MediaSource = getMediaSource(preferManagedMediaSource) || { isTypeSupported: () => false };
	return {
		mpeg: MediaSource.isTypeSupported("audio/mpeg"),
		mp3: MediaSource.isTypeSupported("audio/mp4; codecs=\"mp3\""),
		ac3: false
	};
}
function getCodecsForMimeType(mimeType) {
	return mimeType.replace(/^.+codecs=["']?([^"']+).*$/, "$1");
}
/**
* Set a query parameter on a URL without re-encoding the rest of its query
* string.
*
* `URLSearchParams.set` re-serializes the entire query using
* application/x-www-form-urlencoded rules, percent-encoding characters like
* `~`, `=` and `/` in parameters the playlist author wrote. Signed CDN tokens
* carry those characters verbatim and are validated byte-for-byte, so
* re-encoding them breaks token validation (see #7963). This helper
* component-encodes only the inserted key/value pair and leaves existing
* parameters untouched. Like `URLSearchParams.set`, an existing parameter
* with the same key is replaced in place and duplicates are removed.
*/
function setQueryParam(url, key, value) {
	const encodedKey = encodeURIComponent(key);
	const param = `${encodedKey}=${encodeURIComponent(value)}`;
	let replaced = false;
	const params = [];
	url.search.substring(1).split("&").forEach((p) => {
		if (p === encodedKey || p.startsWith(encodedKey + "=")) {
			if (!replaced) {
				params.push(param);
				replaced = true;
			}
		} else if (p) params.push(p);
	});
	if (!replaced) params.push(param);
	url.search = params.join("&");
}
var HdcpLevels = [
	"NONE",
	"TYPE-0",
	"TYPE-1",
	null
];
function isHdcpLevel(value) {
	return HdcpLevels.indexOf(value) > -1;
}
var VideoRangeValues = [
	"SDR",
	"PQ",
	"HLG"
];
function isVideoRange(value) {
	return !!value && VideoRangeValues.indexOf(value) > -1;
}
var HlsSkip = {
	No: "",
	Yes: "YES",
	v2: "v2"
};
function getSkipValue(details) {
	const { canSkipUntil, canSkipDateRanges, age } = details;
	const playlistRecentEnough = age < canSkipUntil / 2;
	if (canSkipUntil && playlistRecentEnough) {
		if (canSkipDateRanges) return HlsSkip.v2;
		return HlsSkip.Yes;
	}
	return HlsSkip.No;
}
var HlsUrlParameters = class {
	constructor(msn, part, skip) {
		this.msn = void 0;
		this.part = void 0;
		this.skip = void 0;
		this.msn = msn;
		this.part = part;
		this.skip = skip;
	}
	addDirectives(uri) {
		const url = new self.URL(uri);
		if (this.msn !== void 0) setQueryParam(url, "_HLS_msn", this.msn.toString());
		if (this.part !== void 0) setQueryParam(url, "_HLS_part", this.part.toString());
		if (this.skip) setQueryParam(url, "_HLS_skip", this.skip);
		return url.href;
	}
};
var Level = class {
	constructor(data) {
		this._attrs = void 0;
		this.audioCodec = void 0;
		this.bitrate = void 0;
		this.codecSet = void 0;
		this.url = void 0;
		this.frameRate = void 0;
		this.height = void 0;
		this.id = void 0;
		this.name = void 0;
		this.supplemental = void 0;
		this.videoCodec = void 0;
		this.width = void 0;
		this.imageCodec = void 0;
		this.iframes = void 0;
		this.details = void 0;
		this.fragmentError = 0;
		this.loadError = 0;
		this.loadErrorTime = 0;
		this.loaded = void 0;
		this.realBitrate = 0;
		this.supportedPromise = void 0;
		this.supportedResult = void 0;
		this._avgBitrate = 0;
		this._audioGroups = void 0;
		this._subtitleGroups = void 0;
		this._urlId = 0;
		this.url = [data.url];
		this._attrs = [data.attrs];
		this.bitrate = data.bitrate;
		if (data.details) this.details = data.details;
		this.id = data.id || 0;
		this.name = data.name;
		this.width = data.width || 0;
		this.height = data.height || 0;
		this.frameRate = data.attrs.optionalFloat("FRAME-RATE", 0);
		this._avgBitrate = data.attrs.decimalInteger("AVERAGE-BANDWIDTH");
		this.audioCodec = data.audioCodec;
		this.videoCodec = data.videoCodec;
		if ("imageCodec" in data) this.imageCodec = data.imageCodec;
		this.codecSet = [data.videoCodec, data.audioCodec].filter((c) => !!c).map((s) => s.substring(0, 4)).join(",");
		if ("supplemental" in data) {
			var _data$supplemental;
			this.supplemental = data.supplemental;
			const supplementalVideo = (_data$supplemental = data.supplemental) == null ? void 0 : _data$supplemental.videoCodec;
			if (supplementalVideo && supplementalVideo !== data.videoCodec) this.codecSet += `,${supplementalVideo.substring(0, 4)}`;
		}
		if ("iframes" in data && data.iframes) this.iframes = true;
		else {
			this.addGroupId("audio", data.attrs.AUDIO);
			this.addGroupId("text", data.attrs.SUBTITLES);
		}
	}
	get maxBitrate() {
		return Math.max(this.realBitrate, this.bitrate);
	}
	get averageBitrate() {
		return this._avgBitrate || this.realBitrate || this.bitrate;
	}
	get attrs() {
		return this._attrs[0];
	}
	get codecs() {
		return this.attrs.CODECS || "";
	}
	get pathwayId() {
		return this.attrs["PATHWAY-ID"] || ".";
	}
	get videoRange() {
		return this.attrs["VIDEO-RANGE"] || "SDR";
	}
	get score() {
		return this.attrs.optionalFloat("SCORE", 0);
	}
	get uri() {
		return this.url[0] || "";
	}
	hasAudioGroup(groupId) {
		return hasGroup(this._audioGroups, groupId);
	}
	hasSubtitleGroup(groupId) {
		return hasGroup(this._subtitleGroups, groupId);
	}
	get audioGroups() {
		return this._audioGroups;
	}
	get subtitleGroups() {
		return this._subtitleGroups;
	}
	addGroupId(type, groupId) {
		if (!groupId) return;
		if (type === "audio") {
			let audioGroups = this._audioGroups;
			if (!audioGroups) audioGroups = this._audioGroups = [];
			if (audioGroups.indexOf(groupId) === -1) audioGroups.push(groupId);
		} else if (type === "text") {
			let subtitleGroups = this._subtitleGroups;
			if (!subtitleGroups) subtitleGroups = this._subtitleGroups = [];
			if (subtitleGroups.indexOf(groupId) === -1) subtitleGroups.push(groupId);
		}
	}
	get urlId() {
		return 0;
	}
	set urlId(value) {}
	get audioGroupIds() {
		return this.audioGroups ? [this.audioGroupId] : void 0;
	}
	get textGroupIds() {
		return this.subtitleGroups ? [this.textGroupId] : void 0;
	}
	get audioGroupId() {
		var _this$audioGroups;
		return (_this$audioGroups = this.audioGroups) == null ? void 0 : _this$audioGroups[0];
	}
	get textGroupId() {
		var _this$subtitleGroups;
		return (_this$subtitleGroups = this.subtitleGroups) == null ? void 0 : _this$subtitleGroups[0];
	}
	addFallback() {}
};
function hasGroup(groups, groupId) {
	if (!groupId || !groups) return false;
	return groups.indexOf(groupId) !== -1;
}
/**
* @returns Whether we can detect and validate HDR capability within the window context
*/
function isHdrSupported() {
	if (typeof matchMedia === "function") {
		const mediaQueryList = matchMedia("(dynamic-range: high)");
		const badQuery = matchMedia("bad query");
		if (mediaQueryList.media !== badQuery.media) return mediaQueryList.matches === true;
	}
	return false;
}
/**
* Sanitizes inputs to return the active video selection options for HDR/SDR.
* When both inputs are null:
*
*    `{ preferHDR: false, allowedVideoRanges: [] }`
*
* When `currentVideoRange` non-null, maintain the active range:
*
*    `{ preferHDR: currentVideoRange !== 'SDR', allowedVideoRanges: [currentVideoRange] }`
*
* When VideoSelectionOption non-null:
*
*  - Allow all video ranges if `allowedVideoRanges` unspecified.
*  - If `preferHDR` is non-null use the value to filter `allowedVideoRanges`.
*  - Else check window for HDR support and set `preferHDR` to the result.
*
* @param currentVideoRange
* @param videoPreference
*/
function getVideoSelectionOptions(currentVideoRange, videoPreference) {
	let preferHDR = false;
	let allowedVideoRanges = [];
	if (currentVideoRange) {
		preferHDR = currentVideoRange !== "SDR";
		allowedVideoRanges = [currentVideoRange];
	}
	if (videoPreference) {
		allowedVideoRanges = videoPreference.allowedVideoRanges || VideoRangeValues.slice(0);
		const allowAutoPreferHDR = allowedVideoRanges.join("") !== "SDR" && !videoPreference.videoCodec;
		preferHDR = videoPreference.preferHDR !== void 0 ? videoPreference.preferHDR : allowAutoPreferHDR && isHdrSupported();
		if (!preferHDR) allowedVideoRanges = ["SDR"];
	}
	return {
		preferHDR,
		allowedVideoRanges
	};
}
var omitCircularRefsReplacer = (replacer) => {
	const known = /* @__PURE__ */ new WeakSet();
	return (_, value) => {
		if (replacer) value = replacer(_, value);
		if (typeof value === "object" && value !== null) {
			if (known.has(value)) return;
			known.add(value);
		}
		return value;
	};
};
var stringify = (object, replacer) => JSON.stringify(object, omitCircularRefsReplacer(replacer));
function getStartCodecTier(codecTiers, currentVideoRange, currentBw, audioPreference, videoPreference) {
	const codecSets = Object.keys(codecTiers);
	const channelsPreference = audioPreference == null ? void 0 : audioPreference.channels;
	const audioCodecPreference = audioPreference == null ? void 0 : audioPreference.audioCodec;
	const videoCodecPreference = videoPreference == null ? void 0 : videoPreference.videoCodec;
	const preferStereo = channelsPreference && parseInt(channelsPreference) === 2;
	let hasStereo = false;
	let hasCurrentVideoRange = false;
	let minHeight = Infinity;
	let minFramerate = Infinity;
	let minBitrate = Infinity;
	let minIndex = Infinity;
	let selectedScore = 0;
	let videoRanges = [];
	const { preferHDR, allowedVideoRanges } = getVideoSelectionOptions(currentVideoRange, videoPreference);
	for (let i = codecSets.length; i--;) {
		const tier = codecTiers[codecSets[i]];
		hasStereo || (hasStereo = tier.channels[2] > 0);
		minHeight = Math.min(minHeight, tier.minHeight);
		minFramerate = Math.min(minFramerate, tier.minFramerate);
		minBitrate = Math.min(minBitrate, tier.minBitrate);
		if (allowedVideoRanges.filter((range) => tier.videoRanges[range] > 0).length > 0) hasCurrentVideoRange = true;
	}
	minHeight = isFiniteNumber(minHeight) ? minHeight : 0;
	minFramerate = isFiniteNumber(minFramerate) ? minFramerate : 0;
	const maxHeight = Math.max(1080, minHeight);
	const maxFramerate = Math.max(30, minFramerate);
	minBitrate = isFiniteNumber(minBitrate) ? minBitrate : currentBw;
	currentBw = Math.max(minBitrate, currentBw);
	if (!hasCurrentVideoRange) currentVideoRange = void 0;
	const hasMultipleSets = codecSets.length > 1;
	return {
		codecSet: codecSets.reduce((selected, candidate) => {
			const candidateTier = codecTiers[candidate];
			if (candidate === selected) return selected;
			videoRanges = hasCurrentVideoRange ? allowedVideoRanges.filter((range) => candidateTier.videoRanges[range] > 0) : [];
			if (hasMultipleSets) {
				if (candidateTier.minBitrate > currentBw) {
					logStartCodecCandidateIgnored(candidate, `min bitrate of ${candidateTier.minBitrate} > current estimate of ${currentBw}`);
					return selected;
				}
				if (!candidateTier.hasDefaultAudio) {
					logStartCodecCandidateIgnored(candidate, `no renditions with default or auto-select sound found`);
					return selected;
				}
				if (audioCodecPreference && candidate.indexOf(audioCodecPreference.substring(0, 4)) % 5 !== 0) {
					logStartCodecCandidateIgnored(candidate, `audio codec preference "${audioCodecPreference}" not found`);
					return selected;
				}
				if (channelsPreference && !preferStereo) {
					if (!candidateTier.channels[channelsPreference]) {
						logStartCodecCandidateIgnored(candidate, `no renditions with ${channelsPreference} channel sound found (channels options: ${Object.keys(candidateTier.channels)})`);
						return selected;
					}
				} else if ((!audioCodecPreference || preferStereo) && hasStereo && candidateTier.channels["2"] === 0) {
					logStartCodecCandidateIgnored(candidate, `no renditions with stereo sound found`);
					return selected;
				}
				if (candidateTier.minHeight > maxHeight) {
					logStartCodecCandidateIgnored(candidate, `min resolution of ${candidateTier.minHeight} > maximum of ${maxHeight}`);
					return selected;
				}
				if (candidateTier.minFramerate > maxFramerate) {
					logStartCodecCandidateIgnored(candidate, `min framerate of ${candidateTier.minFramerate} > maximum of ${maxFramerate}`);
					return selected;
				}
				if (!videoRanges.some((range) => candidateTier.videoRanges[range] > 0)) {
					logStartCodecCandidateIgnored(candidate, `no variants with VIDEO-RANGE of ${stringify(videoRanges)} found`);
					return selected;
				}
				if (videoCodecPreference && candidate.indexOf(videoCodecPreference.substring(0, 4)) % 5 !== 0) {
					logStartCodecCandidateIgnored(candidate, `video codec preference "${videoCodecPreference}" not found`);
					return selected;
				}
				if (candidateTier.maxScore < selectedScore) {
					logStartCodecCandidateIgnored(candidate, `max score of ${candidateTier.maxScore} < selected max of ${selectedScore}`);
					return selected;
				}
			}
			if (selected && (codecsSetSelectionPreferenceValue(candidate) >= codecsSetSelectionPreferenceValue(selected) || candidateTier.fragmentError > codecTiers[selected].fragmentError)) return selected;
			minIndex = candidateTier.minIndex;
			selectedScore = candidateTier.maxScore;
			return candidate;
		}, void 0),
		videoRanges,
		preferHDR,
		minFramerate,
		minBitrate,
		minIndex
	};
}
function logStartCodecCandidateIgnored(codeSet, reason) {
	logger.log(`[abr] start candidates with "${codeSet}" ignored because ${reason}`);
}
function getAudioTracksByGroup(allAudioTracks) {
	return allAudioTracks.reduce((audioTracksByGroup, track) => {
		let trackGroup = audioTracksByGroup.groups[track.groupId];
		if (!trackGroup) trackGroup = audioTracksByGroup.groups[track.groupId] = {
			tracks: [],
			channels: { 2: 0 },
			hasDefault: false,
			hasAutoSelect: false
		};
		trackGroup.tracks.push(track);
		const channelsKey = track.channels || "2";
		trackGroup.channels[channelsKey] = (trackGroup.channels[channelsKey] || 0) + 1;
		trackGroup.hasDefault = trackGroup.hasDefault || track.default;
		trackGroup.hasAutoSelect = trackGroup.hasAutoSelect || track.autoselect;
		if (trackGroup.hasDefault) audioTracksByGroup.hasDefaultAudio = true;
		if (trackGroup.hasAutoSelect) audioTracksByGroup.hasAutoSelectAudio = true;
		return audioTracksByGroup;
	}, {
		hasDefaultAudio: false,
		hasAutoSelectAudio: false,
		groups: {}
	});
}
function getCodecTiers(levels, audioTracksByGroup, minAutoLevel, maxAutoLevel) {
	return levels.slice(minAutoLevel, maxAutoLevel + 1).reduce((tiers, level, index) => {
		if (!level.codecSet) return tiers;
		const audioGroups = level.audioGroups;
		let tier = tiers[level.codecSet];
		if (!tier) tiers[level.codecSet] = tier = {
			minBitrate: Infinity,
			minHeight: Infinity,
			minFramerate: Infinity,
			minIndex: index,
			maxScore: 0,
			videoRanges: { SDR: 0 },
			channels: { "2": 0 },
			hasDefaultAudio: !audioGroups,
			fragmentError: 0
		};
		tier.minBitrate = Math.min(tier.minBitrate, level.bitrate);
		const lesserWidthOrHeight = Math.min(level.height, level.width);
		tier.minHeight = Math.min(tier.minHeight, lesserWidthOrHeight);
		tier.minFramerate = Math.min(tier.minFramerate, level.frameRate);
		tier.minIndex = Math.min(tier.minIndex, index);
		tier.maxScore = Math.max(tier.maxScore, level.score);
		tier.fragmentError += level.fragmentError;
		tier.videoRanges[level.videoRange] = (tier.videoRanges[level.videoRange] || 0) + 1;
		return tiers;
	}, {});
}
function useAlternateAudio(audioTrackUrl, hls) {
	var _hls$loadLevelObj;
	return !!audioTrackUrl && audioTrackUrl !== ((_hls$loadLevelObj = hls.loadLevelObj) == null ? void 0 : _hls$loadLevelObj.uri);
}
var AbrController = class extends Logger {
	constructor(_hls) {
		super("abr", _hls.logger);
		this.hls = void 0;
		this.lastLevelLoadSec = 0;
		this.lastLoadedFragLevel = -1;
		this.firstSelection = -1;
		this.firstAutoFloor = -1;
		this._nextAutoLevel = -1;
		this.nextAutoLevelKey = "";
		this.audioTracksByGroup = null;
		this.codecTiers = null;
		this.timer = -1;
		this.fragCurrent = null;
		this.partCurrent = null;
		this.bitrateTestDelay = 0;
		this.rebufferNotice = -1;
		this.supportedCache = {};
		this.bwEstimator = void 0;
		this._abandonRulesCheck = (levelLoaded) => {
			var _ref;
			const { fragCurrent: frag, partCurrent: part, hls } = this;
			if (!hls) return;
			const { autoLevelEnabled, media } = hls;
			if (!frag || !media) return;
			const now = performance.now();
			const stats = part ? part.stats : frag.stats;
			const duration = part ? part.duration : frag.duration;
			const timeLoading = now - stats.loading.start;
			const minAutoLevel = hls.minAutoLevel;
			const loadingFragForLevel = frag.level;
			const currentAutoLevel = this._nextAutoLevel;
			if (stats.aborted || stats.loaded && stats.loaded === stats.total || loadingFragForLevel <= minAutoLevel) {
				this.clearTimer();
				this._nextAutoLevel = -1;
				return;
			}
			if (!autoLevelEnabled) return;
			const fragBlockingSwitch = currentAutoLevel > -1 && currentAutoLevel !== loadingFragForLevel;
			const levelChange = !!levelLoaded || fragBlockingSwitch;
			if (!levelChange && (media.paused || !media.playbackRate || !media.readyState)) return;
			const bufferInfo = hls.mainForwardBufferInfo;
			if (!levelChange && bufferInfo === null) return;
			const ttfbEstimate = this.bwEstimator.getEstimateTTFB();
			const playbackRate = Math.abs(media.playbackRate);
			if (timeLoading <= Math.max(ttfbEstimate, 1e3 * (duration / (playbackRate * 2)))) return;
			const bufferStarvationDelay = bufferInfo ? bufferInfo.len / playbackRate : 0;
			const ttfb = stats.loading.first ? stats.loading.first - stats.loading.start : -1;
			const loadedFirstByte = stats.loaded && ttfb > -1;
			const bwEstimate = this.getBwEstimate();
			const levels = hls.levels;
			const level = levels[loadingFragForLevel];
			const expectedLen = Math.max(stats.loaded, Math.round(duration * (frag.bitrate || level.averageBitrate) / 8));
			let timeStreaming = loadedFirstByte ? timeLoading - ttfb : timeLoading;
			if (timeStreaming < 1 && loadedFirstByte) timeStreaming = Math.min(timeLoading, stats.loaded * 8 / bwEstimate);
			const loadRate = loadedFirstByte ? stats.loaded * 1e3 / timeStreaming : 0;
			const ttfbSeconds = ttfbEstimate / 1e3;
			const fragLoadedDelay = loadRate ? (expectedLen - stats.loaded) / loadRate : expectedLen * 8 / bwEstimate + ttfbSeconds;
			if (fragLoadedDelay <= bufferStarvationDelay) return;
			const bwe = loadRate ? loadRate * 8 : bwEstimate;
			const live = ((_ref = (levelLoaded == null ? void 0 : levelLoaded.details) || hls.latestLevelDetails) == null ? void 0 : _ref.live) === true;
			const abrBandWidthUpFactor = hls.config.abrBandWidthUpFactor;
			let fragLevelNextLoadedDelay = Number.POSITIVE_INFINITY;
			let nextLoadLevel;
			for (nextLoadLevel = loadingFragForLevel - 1; nextLoadLevel > minAutoLevel; nextLoadLevel--) {
				const levelNextBitrate = levels[nextLoadLevel].maxBitrate;
				const requiresLevelLoad = !levels[nextLoadLevel].details || live;
				fragLevelNextLoadedDelay = this.getTimeToLoadFrag(ttfbSeconds, bwe, duration * levelNextBitrate, requiresLevelLoad);
				if (fragLevelNextLoadedDelay < Math.min(bufferStarvationDelay, duration + ttfbSeconds)) break;
			}
			if (fragLevelNextLoadedDelay >= fragLoadedDelay) return;
			if (fragLevelNextLoadedDelay > duration * 10) return;
			if (loadedFirstByte) this.bwEstimator.sample(timeLoading - Math.min(ttfbEstimate, ttfb), stats.loaded);
			else this.bwEstimator.sampleTTFB(timeLoading);
			const nextLoadLevelBitrate = levels[nextLoadLevel].maxBitrate;
			if (this.getBwEstimate() * abrBandWidthUpFactor > nextLoadLevelBitrate) {
				this.firstAutoFloor = Math.min(nextLoadLevel, hls.firstLevel);
				this.resetEstimator(nextLoadLevelBitrate);
			}
			const bestSwitchLevel = this.findBestLevel(nextLoadLevelBitrate, minAutoLevel, nextLoadLevel, 0, bufferStarvationDelay, 1, 1);
			if (bestSwitchLevel > -1) nextLoadLevel = bestSwitchLevel;
			this.warn(`Fragment ${frag.sn}${part ? " part " + part.index : ""} of level ${loadingFragForLevel} is loading too slowly;
      Fragment duration: ${frag.duration.toFixed(3)}
      Time to underbuffer: ${bufferStarvationDelay.toFixed(3)} s
      Estimated load time for current fragment: ${fragLoadedDelay.toFixed(3)} s
      Estimated load time for down switch fragment: ${fragLevelNextLoadedDelay.toFixed(3)} s
      TTFB estimate: ${ttfb | 0} ms
      Current BW estimate: ${isFiniteNumber(bwEstimate) ? bwEstimate | 0 : "Unknown"} bps
      New BW estimate: ${this.getBwEstimate() | 0} bps
      Switching to level ${nextLoadLevel} @ ${nextLoadLevelBitrate | 0} bps`);
			hls.nextLoadLevel = hls.nextAutoLevel = nextLoadLevel;
			this.clearTimer();
			const abortAndSwitch = () => {
				this.clearTimer();
				const hls = this.hls;
				if (this.fragCurrent === frag && hls.loadLevel === nextLoadLevel && nextLoadLevel > 0) {
					const bufferStarvationDelay = this.getStarvationDelay();
					this.warn(`Aborting inflight request ${nextLoadLevel > 0 ? "and switching down" : ""}
      Fragment duration: ${frag.duration.toFixed(3)} s
      Time to underbuffer: ${bufferStarvationDelay.toFixed(3)} s`);
					frag.abortRequests();
					this.fragCurrent = this.partCurrent = null;
					if (nextLoadLevel > minAutoLevel) {
						let lowestSwitchLevel = this.findBestLevel(hls.levels[minAutoLevel].bitrate, minAutoLevel, nextLoadLevel, 0, bufferStarvationDelay, 1, 1);
						if (lowestSwitchLevel === -1) lowestSwitchLevel = minAutoLevel;
						hls.nextLoadLevel = hls.nextAutoLevel = lowestSwitchLevel;
						this.firstAutoFloor = Math.min(lowestSwitchLevel, hls.firstLevel);
						this.resetEstimator(hls.levels[lowestSwitchLevel].bitrate);
					}
				}
			};
			if (fragBlockingSwitch || fragLoadedDelay > fragLevelNextLoadedDelay * 2) abortAndSwitch();
			else this.timer = self.setInterval(abortAndSwitch, fragLevelNextLoadedDelay * 1e3);
			hls.trigger(Events.FRAG_LOAD_EMERGENCY_ABORTED, {
				frag,
				part,
				stats
			});
		};
		this.hls = _hls;
		this.bwEstimator = this.initEstimator();
		this.registerListeners();
	}
	resetEstimator(abrEwmaDefaultEstimate) {
		if (!this.hls) return;
		if (abrEwmaDefaultEstimate) {
			this.log(`setting initial bwe to ${abrEwmaDefaultEstimate}`);
			this.hls.config.abrEwmaDefaultEstimate = abrEwmaDefaultEstimate;
		}
		this.firstSelection = -1;
		this.bwEstimator = this.initEstimator();
	}
	initEstimator() {
		const config = this.hls.config;
		return new EwmaBandWidthEstimator(config.abrEwmaSlowVoD, config.abrEwmaFastVoD, config.abrEwmaDefaultEstimate);
	}
	registerListeners() {
		const hls = this.hls;
		hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.on(Events.FRAG_LOADING, this.onFragLoading, this);
		hls.on(Events.FRAG_LOADED, this.onFragLoaded, this);
		hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
		hls.on(Events.LEVEL_SWITCHING, this.onLevelSwitching, this);
		hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
		hls.on(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
		hls.on(Events.MAX_AUTO_LEVEL_UPDATED, this.onMaxAutoLevelUpdated, this);
		hls.on(Events.ERROR, this.onError, this);
	}
	unregisterListeners() {
		const { hls } = this;
		if (!hls) return;
		hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.off(Events.FRAG_LOADING, this.onFragLoading, this);
		hls.off(Events.FRAG_LOADED, this.onFragLoaded, this);
		hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
		hls.off(Events.LEVEL_SWITCHING, this.onLevelSwitching, this);
		hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
		hls.off(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
		hls.off(Events.MAX_AUTO_LEVEL_UPDATED, this.onMaxAutoLevelUpdated, this);
		hls.off(Events.ERROR, this.onError, this);
	}
	destroy() {
		this.unregisterListeners();
		this.clearTimer();
		this.hls = this._abandonRulesCheck = this.supportedCache = null;
		this.audioTracksByGroup = this.codecTiers = this.fragCurrent = this.partCurrent = null;
	}
	onManifestLoading(event, data) {
		this.lastLoadedFragLevel = -1;
		this.firstSelection = -1;
		this.firstAutoFloor = -1;
		this.lastLevelLoadSec = 0;
		this.supportedCache = {};
		this.fragCurrent = this.partCurrent = null;
		this.onLevelsUpdated();
		this.clearTimer();
	}
	onLevelsUpdated() {
		if (this.lastLoadedFragLevel > -1 && this.fragCurrent) this.lastLoadedFragLevel = this.fragCurrent.level;
		this._nextAutoLevel = -1;
		this.onMaxAutoLevelUpdated();
		this.codecTiers = null;
		this.audioTracksByGroup = null;
	}
	onMaxAutoLevelUpdated() {
		this.firstSelection = -1;
		this.nextAutoLevelKey = "";
	}
	onFragLoading(event, data) {
		const frag = data.frag;
		if (this.ignoreFragment(frag)) return;
		if (!frag.bitrateTest) {
			var _data$part;
			this.fragCurrent = frag;
			this.partCurrent = (_data$part = data.part) != null ? _data$part : null;
		}
		this.clearTimer();
		this.timer = self.setInterval(this._abandonRulesCheck, 100);
	}
	onLevelSwitching(event, data) {
		this.clearTimer();
	}
	onError(event, data) {
		if (data.fatal) return;
		switch (data.details) {
			case ErrorDetails.BUFFER_ADD_CODEC_ERROR:
			case ErrorDetails.BUFFER_APPEND_ERROR:
				this.lastLoadedFragLevel = -1;
				this.firstSelection = -1;
				break;
			case ErrorDetails.FRAG_LOAD_TIMEOUT: {
				const frag = data.frag;
				const { fragCurrent, partCurrent: part } = this;
				if (frag && fragmentsAreEqual(frag, fragCurrent)) {
					const now = performance.now();
					const stats = part ? part.stats : frag.stats;
					const timeLoading = now - stats.loading.start;
					const ttfb = stats.loading.first ? stats.loading.first - stats.loading.start : -1;
					if (stats.loaded && ttfb > -1) {
						const ttfbEstimate = this.bwEstimator.getEstimateTTFB();
						this.bwEstimator.sample(timeLoading - Math.min(ttfbEstimate, ttfb), stats.loaded);
					} else this.bwEstimator.sampleTTFB(timeLoading);
				}
				break;
			}
		}
	}
	getTimeToLoadFrag(timeToFirstByteSec, bandwidth, fragSizeBits, isSwitch) {
		return timeToFirstByteSec + fragSizeBits / bandwidth + (isSwitch ? timeToFirstByteSec + this.lastLevelLoadSec : 0);
	}
	onLevelLoaded(event, data) {
		const config = this.hls.config;
		const { loading } = data.stats;
		const timeLoadingMs = loading.end - loading.first;
		if (isFiniteNumber(timeLoadingMs)) this.lastLevelLoadSec = timeLoadingMs / 1e3;
		if (data.details.live) this.bwEstimator.update(config.abrEwmaSlowLive, config.abrEwmaFastLive);
		else this.bwEstimator.update(config.abrEwmaSlowVoD, config.abrEwmaFastVoD);
		if (this.timer > -1) this._abandonRulesCheck(data.levelInfo);
	}
	onFragLoaded(event, data) {
		var _this$hls;
		const { frag, part } = data;
		const stats = part ? part.stats : frag.stats;
		if (frag.type === PlaylistLevelType.MAIN) this.bwEstimator.sampleTTFB(stats.loading.first - stats.loading.start);
		if (this.ignoreFragment(frag)) return;
		this.clearTimer();
		if (frag.level === this._nextAutoLevel) this._nextAutoLevel = -1;
		this.firstSelection = -1;
		if ((_this$hls = this.hls) != null && _this$hls.config.abrMaxWithRealBitrate) {
			const duration = part ? part.duration : frag.duration;
			const level = this.hls.levels[frag.level];
			const loadedBytes = (level.loaded ? level.loaded.bytes : 0) + stats.loaded;
			const loadedDuration = (level.loaded ? level.loaded.duration : 0) + duration;
			level.loaded = {
				bytes: loadedBytes,
				duration: loadedDuration
			};
			level.realBitrate = Math.round(8 * loadedBytes / loadedDuration);
		}
		if (frag.bitrateTest) {
			const fragBufferedData = {
				stats,
				frag,
				part,
				id: frag.type
			};
			this.onFragBuffered(Events.FRAG_BUFFERED, fragBufferedData);
			frag.bitrateTest = false;
		} else this.lastLoadedFragLevel = frag.level;
	}
	onFragBuffered(event, data) {
		const { frag, part } = data;
		const stats = part != null && part.stats.loaded ? part.stats : frag.stats;
		if (stats.aborted) return;
		if (this.ignoreFragment(frag)) return;
		const processingMs = ((frag.bitrate || 0) >= 1e5 ? stats.parsing.end : stats.loading.end) - stats.loading.start - Math.min(stats.loading.first - stats.loading.start, this.bwEstimator.getEstimateTTFB());
		this.bwEstimator.sample(processingMs, stats.loaded);
		stats.bwEstimate = this.getBwEstimate();
		if (frag.bitrateTest) this.bitrateTestDelay = processingMs / 1e3;
		else {
			this.bitrateTestDelay = 0;
			if (this.firstAutoFloor > -1 && this.bwEstimator.canEstimate()) this.firstAutoFloor = -1;
		}
	}
	ignoreFragment(frag) {
		return frag.type !== PlaylistLevelType.MAIN || frag.sn === "initSegment";
	}
	clearTimer() {
		if (this.timer > -1) {
			self.clearInterval(this.timer);
			this.timer = -1;
		}
	}
	get firstAutoLevel() {
		const { hls } = this;
		if (!hls) return 0;
		const { maxAutoLevel, minAutoLevel } = hls;
		const bwEstimate = this.getBwEstimate();
		const bufferStarvationDelay = this.getStarvationDelay();
		const maxStartDelay = hls.config.maxStarvationDelay;
		const abrAutoLevel = this.findBestLevel(bwEstimate, minAutoLevel, maxAutoLevel, bufferStarvationDelay / 2, maxStartDelay, 1, 1);
		if (abrAutoLevel > -1) return abrAutoLevel;
		const firstLevel = hls.firstLevel;
		const firstAutoFloor = this.firstAutoFloor === -1 ? Infinity : this.firstAutoFloor;
		const clamped = Math.min(Math.max(firstLevel, minAutoLevel), maxAutoLevel, firstAutoFloor);
		this.warn(`Could not find best starting auto level. Defaulting to first in playlist ${firstLevel} clamped to ${clamped}`);
		return clamped;
	}
	get forcedAutoLevel() {
		if (this.nextAutoLevelKey) return -1;
		return this._nextAutoLevel;
	}
	get nextAutoLevel() {
		if (!this.hls) return -1;
		const forcedAutoLevel = this.forcedAutoLevel;
		const useEstimate = this.bwEstimator.canEstimate();
		const loadedFirstFrag = this.lastLoadedFragLevel > -1;
		if (forcedAutoLevel !== -1 && (!useEstimate || !loadedFirstFrag || this.nextAutoLevelKey === this.getAutoLevelKey())) return forcedAutoLevel;
		const nextABRAutoLevel = useEstimate && loadedFirstFrag ? this.getNextABRAutoLevel() : this.firstAutoLevel;
		if (forcedAutoLevel !== -1) {
			const levels = this.hls.levels;
			if (levels.length > Math.max(forcedAutoLevel, nextABRAutoLevel) && levels[forcedAutoLevel].loadError <= levels[nextABRAutoLevel].loadError) return forcedAutoLevel;
		}
		this._nextAutoLevel = nextABRAutoLevel;
		this.nextAutoLevelKey = this.getAutoLevelKey();
		return nextABRAutoLevel;
	}
	getAutoLevelKey() {
		return `${this.getBwEstimate()}_${this.getStarvationDelay().toFixed(2)}`;
	}
	getNextABRAutoLevel() {
		const { fragCurrent, partCurrent, hls } = this;
		if (!hls) return -1;
		if (hls.levels.length <= 1) return hls.loadLevel;
		const { maxAutoLevel, config, minAutoLevel } = hls;
		const currentFragDuration = partCurrent ? partCurrent.duration : fragCurrent ? fragCurrent.duration : 0;
		const avgbw = this.getBwEstimate();
		const bufferStarvationDelay = this.getStarvationDelay();
		let bwFactor = config.abrBandWidthFactor;
		let bwUpFactor = config.abrBandWidthUpFactor;
		if (bufferStarvationDelay) {
			const _bestLevel = this.findBestLevel(avgbw, minAutoLevel, maxAutoLevel, bufferStarvationDelay, 0, bwFactor, bwUpFactor);
			if (_bestLevel >= 0) {
				this.rebufferNotice = -1;
				return _bestLevel;
			}
		}
		let maxStarvationDelay = currentFragDuration ? Math.min(currentFragDuration, config.maxStarvationDelay) : config.maxStarvationDelay;
		if (!bufferStarvationDelay) {
			const bitrateTestDelay = this.bitrateTestDelay;
			if (bitrateTestDelay) {
				maxStarvationDelay = (currentFragDuration ? Math.min(currentFragDuration, config.maxLoadingDelay) : config.maxLoadingDelay) - bitrateTestDelay;
				this.info(`bitrate test took ${Math.round(1e3 * bitrateTestDelay)}ms, set first fragment max fetchDuration to ${Math.round(1e3 * maxStarvationDelay)} ms`);
				bwFactor = bwUpFactor = 1;
			}
		}
		const bestLevel = this.findBestLevel(avgbw, minAutoLevel, maxAutoLevel, bufferStarvationDelay, maxStarvationDelay, bwFactor, bwUpFactor);
		if (this.rebufferNotice !== bestLevel) {
			this.rebufferNotice = bestLevel;
			this.info(`${bufferStarvationDelay ? "rebuffering expected" : "buffer is empty"}, optimal quality level ${bestLevel}`);
		}
		if (bestLevel > -1) return bestLevel;
		const minLevel = hls.levels[minAutoLevel];
		const autoLevel = hls.loadLevelObj;
		if (autoLevel && (minLevel == null ? void 0 : minLevel.bitrate) < autoLevel.bitrate) return minAutoLevel;
		return hls.loadLevel;
	}
	getStarvationDelay() {
		const hls = this.hls;
		const media = hls == null ? void 0 : hls.media;
		if (!media) return Infinity;
		const playbackRate = media && media.playbackRate !== 0 ? Math.abs(media.playbackRate) : 1;
		const bufferInfo = hls.mainForwardBufferInfo;
		return (bufferInfo ? bufferInfo.len : 0) / playbackRate;
	}
	getBwEstimate() {
		return this.bwEstimator.getEstimate();
	}
	findBestLevel(currentBw, minAutoLevel, maxAutoLevel, bufferStarvationDelay, maxStarvationDelay, bwFactor, bwUpFactor) {
		const { hls, lastLoadedFragLevel, fragCurrent, partCurrent } = this;
		if (!hls) return -1;
		const maxFetchDuration = bufferStarvationDelay + maxStarvationDelay;
		const selectionBaseLevel = lastLoadedFragLevel === -1 ? hls.firstLevel : lastLoadedFragLevel;
		const { levels, allAudioTracks, loadLevel, latestLevelDetails, config } = hls;
		if (levels.length === 1) return 0;
		const level = levels[selectionBaseLevel];
		const live = !!(latestLevelDetails != null && latestLevelDetails.live);
		const firstSelection = loadLevel === -1 || lastLoadedFragLevel === -1;
		let currentCodecSet;
		let currentVideoRange = "SDR";
		let currentFrameRate = (level == null ? void 0 : level.frameRate) || 0;
		const { audioPreference, videoPreference } = config;
		const audioTracksByGroup = this.audioTracksByGroup || (this.audioTracksByGroup = getAudioTracksByGroup(allAudioTracks));
		let minStartIndex = -1;
		if (firstSelection) {
			if (this.firstSelection !== -1) return this.firstSelection;
			const startTier = getStartCodecTier(this.codecTiers || (this.codecTiers = getCodecTiers(levels, audioTracksByGroup, minAutoLevel, maxAutoLevel)), currentVideoRange, currentBw, audioPreference, videoPreference);
			const { codecSet, videoRanges, minFramerate, minBitrate, minIndex, preferHDR } = startTier;
			minStartIndex = minIndex;
			currentCodecSet = codecSet;
			currentVideoRange = preferHDR ? videoRanges[videoRanges.length - 1] : videoRanges[0];
			currentFrameRate = minFramerate;
			currentBw = Math.max(currentBw, minBitrate);
			this.log(`picked start tier ${stringify(startTier)}`);
		} else {
			currentCodecSet = level == null ? void 0 : level.codecSet;
			currentVideoRange = level == null ? void 0 : level.videoRange;
		}
		const currentFragDuration = partCurrent ? partCurrent.duration : fragCurrent ? fragCurrent.duration : 0;
		const ttfbEstimateSec = this.bwEstimator.getEstimateTTFB() / 1e3;
		const levelsSkipped = [];
		for (let i = maxAutoLevel; i >= minAutoLevel; i--) {
			var _levelInfo$supportedR;
			const levelInfo = levels[i];
			const upSwitch = i > selectionBaseLevel;
			if (!levelInfo) continue;
			if (currentCodecSet && levelInfo.codecSet !== currentCodecSet || currentVideoRange && levelInfo.videoRange !== currentVideoRange || upSwitch && currentFrameRate > levelInfo.frameRate || !upSwitch && currentFrameRate > 0 && currentFrameRate < levelInfo.frameRate || (_levelInfo$supportedR = levelInfo.supportedResult) != null && (_levelInfo$supportedR = _levelInfo$supportedR.decodingInfoResults) != null && _levelInfo$supportedR.some((info) => info.smooth === false)) {
				if (!firstSelection || i !== minStartIndex) {
					levelsSkipped.push(i);
					continue;
				}
			}
			const levelDetails = levelInfo.details;
			const avgDuration = (partCurrent ? levelDetails == null ? void 0 : levelDetails.partTarget : levelDetails == null ? void 0 : levelDetails.averagetargetduration) || currentFragDuration || 1;
			let adjustedbw;
			if (!upSwitch) adjustedbw = bwFactor * currentBw;
			else adjustedbw = bwUpFactor * currentBw;
			const bitrate = currentFragDuration && bufferStarvationDelay >= currentFragDuration * 2 && maxStarvationDelay === 0 ? levelInfo.averageBitrate : levelInfo.maxBitrate;
			const fetchDuration = this.getTimeToLoadFrag(ttfbEstimateSec, adjustedbw, bitrate * avgDuration, !levelDetails || levelDetails.live);
			if (adjustedbw >= bitrate && (i === lastLoadedFragLevel || levelInfo.loadError === 0 && levelInfo.fragmentError === 0 || isPenaltyExpired(levelInfo, config.errorPenaltyExpireMs)) && (fetchDuration <= ttfbEstimateSec || !isFiniteNumber(fetchDuration) || live && !this.bitrateTestDelay || fetchDuration < maxFetchDuration)) {
				const forcedAutoLevel = this.forcedAutoLevel;
				if (i !== loadLevel && (forcedAutoLevel === -1 || forcedAutoLevel !== loadLevel)) {
					if (levelsSkipped.length) this.trace(`Skipped level(s) ${levelsSkipped.join(",")} of ${maxAutoLevel} max with CODECS and VIDEO-RANGE:"${levels[levelsSkipped[0]].codecs}" ${levels[levelsSkipped[0]].videoRange}; not compatible with "${currentCodecSet}" ${currentVideoRange}`);
					this.info(`switch candidate:${selectionBaseLevel}->${i} adjustedbw(${Math.round(adjustedbw)})-bitrate=${Math.round(adjustedbw - bitrate)} ttfb:${ttfbEstimateSec.toFixed(1)} avgDuration:${avgDuration.toFixed(1)} maxFetchDuration:${maxFetchDuration.toFixed(1)} fetchDuration:${fetchDuration.toFixed(1)} firstSelection:${firstSelection} codecSet:${levelInfo.codecSet} videoRange:${levelInfo.videoRange} hls.loadLevel:${loadLevel}`);
				}
				if (firstSelection) this.firstSelection = i;
				return i;
			}
		}
		return -1;
	}
	set nextAutoLevel(nextLevel) {
		const value = this.deriveNextAutoLevel(nextLevel);
		if (this._nextAutoLevel !== value) {
			this.nextAutoLevelKey = "";
			this._nextAutoLevel = value;
		}
	}
	deriveNextAutoLevel(nextLevel) {
		if (!this.hls) return -1;
		const { maxAutoLevel, minAutoLevel } = this.hls;
		return Math.min(Math.max(nextLevel, minAutoLevel), maxAutoLevel);
	}
};
var BinarySearch = { 
/**
* Searches for an item in an array which matches a certain condition.
* This requires the condition to only match one item in the array,
* and for the array to be ordered.
*
* @param list The array to search.
* @param comparisonFn
*      Called and provided a candidate item as the first argument.
*      Should return:
*          > -1 if the item should be located at a lower index than the provided item.
*          > 1 if the item should be located at a higher index than the provided item.
*          > 0 if the item is the item you're looking for.
*
* @returns the object if found, otherwise returns null
*/
search: function(list, comparisonFn) {
	let minIndex = 0;
	let maxIndex = list.length - 1;
	let currentIndex = null;
	let currentElement = null;
	while (minIndex <= maxIndex) {
		currentIndex = (minIndex + maxIndex) / 2 | 0;
		currentElement = list[currentIndex];
		const comparisonResult = comparisonFn(currentElement);
		if (comparisonResult > 0) minIndex = currentIndex + 1;
		else if (comparisonResult < 0) maxIndex = currentIndex - 1;
		else return currentElement;
	}
	return null;
} };
/**
* Returns first fragment whose endPdt value exceeds the given PDT, or null.
* @param fragments - The array of candidate fragments
* @param PDTValue - The PDT value which must be exceeded
* @param maxFragLookUpTolerance - The amount of time that a fragment's start/end can be within in order to be considered contiguous
*/
function findFragmentByPDT(fragments, PDTValue, maxFragLookUpTolerance) {
	if (PDTValue === null || !Array.isArray(fragments) || !fragments.length || !isFiniteNumber(PDTValue)) return null;
	if (PDTValue < (fragments[0].programDateTime || 0)) return null;
	if (PDTValue >= (fragments[fragments.length - 1].endProgramDateTime || 0)) return null;
	for (let seg = 0; seg < fragments.length; ++seg) {
		const frag = fragments[seg];
		if (pdtWithinToleranceTest(PDTValue, maxFragLookUpTolerance, frag)) return frag;
	}
	return null;
}
/**
* Finds a fragment based on the SN of the previous fragment; or based on the needs of the current buffer.
* This method compensates for small buffer gaps by applying a tolerance to the start of any candidate fragment, thus
* breaking any traps which would cause the same fragment to be continuously selected within a small range.
* @param fragPrevious - The last frag successfully appended
* @param fragments - The array of candidate fragments
* @param bufferEnd - The end of the contiguous buffered range the playhead is currently within
* @param maxFragLookUpTolerance - The amount of time that a fragment's start/end can be within in order to be considered contiguous
* @returns a matching fragment or null
*/
function findFragmentByPTS(fragPrevious, fragments, bufferEnd = 0, maxFragLookUpTolerance = 0, nextFragLookupTolerance = .005) {
	let fragNext = null;
	if (fragPrevious) {
		fragNext = fragments[1 + fragPrevious.sn - fragments[0].sn] || null;
		const bufferEdgeError = fragPrevious.endDTS - bufferEnd;
		if (bufferEdgeError > 0 && bufferEdgeError < 15e-7) bufferEnd += 15e-7;
		if (fragNext && fragPrevious.level !== fragNext.level && fragNext.end <= fragPrevious.end) fragNext = fragments[2 + fragPrevious.sn - fragments[0].sn] || null;
	} else if (bufferEnd === 0 && fragments[0].start === 0) fragNext = fragments[0];
	if (fragNext && ((!fragPrevious || fragPrevious.level === fragNext.level) && fragmentWithinToleranceTest(bufferEnd, maxFragLookUpTolerance, fragNext) === 0 || fragmentWithinFastStartSwitch(fragNext, fragPrevious, Math.min(nextFragLookupTolerance, maxFragLookUpTolerance)))) return fragNext;
	const foundFragment = BinarySearch.search(fragments, fragmentWithinToleranceTest.bind(null, bufferEnd, maxFragLookUpTolerance));
	if (foundFragment && (foundFragment !== fragPrevious || !fragNext)) return foundFragment;
	return fragNext;
}
function fragmentWithinFastStartSwitch(fragNext, fragPrevious, nextFragLookupTolerance) {
	if ((fragPrevious == null ? void 0 : fragPrevious.start) === 0 && fragPrevious.level < fragNext.level && (fragPrevious.endPTS || 0) > 0) {
		const firstDuration = fragPrevious.tagList.reduce((duration, tag) => {
			if (tag[0] === "INF") duration += parseFloat(tag[1]);
			return duration;
		}, nextFragLookupTolerance);
		return fragNext.start <= firstDuration;
	}
	return false;
}
/**
* The test function used by the findFragmentBySn's BinarySearch to look for the best match to the current buffer conditions.
* @param candidate - The fragment to test
* @param bufferEnd - The end of the current buffered range the playhead is currently within
* @param maxFragLookUpTolerance - The amount of time that a fragment's start can be within in order to be considered contiguous
* @returns 0 if it matches, 1 if too low, -1 if too high
*/
function fragmentWithinToleranceTest(bufferEnd = 0, maxFragLookUpTolerance = 0, candidate) {
	if (candidate.start <= bufferEnd && candidate.start + candidate.duration > bufferEnd) return 0;
	const candidateLookupTolerance = Math.min(maxFragLookUpTolerance, candidate.duration + (candidate.deltaPTS ? candidate.deltaPTS : 0));
	if (candidate.start + candidate.duration - candidateLookupTolerance <= bufferEnd) return 1;
	else if (candidate.start - candidateLookupTolerance > bufferEnd && candidate.start) return -1;
	return 0;
}
/**
* The test function used by the findFragmentByPdt's BinarySearch to look for the best match to the current buffer conditions.
* This function tests the candidate's program date time values, as represented in Unix time
* @param candidate - The fragment to test
* @param pdtBufferEnd - The Unix time representing the end of the current buffered range
* @param maxFragLookUpTolerance - The amount of time that a fragment's start can be within in order to be considered contiguous
* @returns true if contiguous, false otherwise
*/
function pdtWithinToleranceTest(pdtBufferEnd, maxFragLookUpTolerance, candidate) {
	const candidateLookupTolerance = Math.min(maxFragLookUpTolerance, candidate.duration + (candidate.deltaPTS ? candidate.deltaPTS : 0)) * 1e3;
	return (candidate.endProgramDateTime || 0) - candidateLookupTolerance > pdtBufferEnd;
}
function findNearestWithCC(details, cc, pos) {
	if (details) {
		if (details.startCC <= cc && details.endCC >= cc) {
			let fragments = details.fragments;
			const { fragmentHint } = details;
			if (fragmentHint) fragments = fragments.concat(fragmentHint);
			let closest;
			BinarySearch.search(fragments, (candidate) => {
				if (candidate.cc < cc) return 1;
				if (candidate.cc > cc) return -1;
				closest = candidate;
				if (candidate.end <= pos) return 1;
				if (candidate.start > pos) return -1;
				return 0;
			});
			return closest || null;
		}
	}
	return null;
}
function getNextFrag(details, sn) {
	if (sn === details.endSN && details.fragmentHint) return details.fragmentHint;
	return details.fragments[1 + sn - details.startSN] || null;
}
var NetworkErrorAction = {
	DoNothing: 0,
	SendEndCallback: 1,
	SendAlternateToPenaltyBox: 2,
	RemoveAlternatePermanently: 3,
	InsertDiscontinuity: 4,
	RetryRequest: 5
};
var ErrorActionFlags = {
	None: 0,
	MoveAllAlternatesMatchingHost: 1,
	MoveAllAlternatesMatchingHDCP: 2,
	MoveAllAlternatesMatchingKey: 4,
	SwitchToSDR: 8,
	ResetMediaSource: 16
};
var ErrorController = class extends Logger {
	constructor(hls) {
		super("error-controller", hls.logger);
		this.hls = void 0;
		this.playlistError = 0;
		this.hls = hls;
		this.registerListeners();
	}
	registerListeners() {
		const hls = this.hls;
		hls.on(Events.ERROR, this.onError, this);
		hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.on(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
	}
	unregisterListeners() {
		const hls = this.hls;
		if (!hls) return;
		hls.off(Events.ERROR, this.onError, this);
		hls.off(Events.ERROR, this.onErrorOut, this);
		hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.off(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
	}
	destroy() {
		this.unregisterListeners();
		this.hls = null;
	}
	startLoad(startPosition) {}
	stopLoad() {
		this.playlistError = 0;
	}
	getVariantLevelIndex(frag) {
		if ((frag == null ? void 0 : frag.type) === PlaylistLevelType.MAIN) return frag.level;
		return this.getVariantIndex();
	}
	getVariantIndex() {
		var _hls$loadLevelObj;
		const hls = this.hls;
		const currentLevel = hls.currentLevel;
		if ((_hls$loadLevelObj = hls.loadLevelObj) != null && _hls$loadLevelObj.details || currentLevel === -1) return hls.loadLevel;
		return currentLevel;
	}
	variantHasKey(level, keyInError) {
		if (level) {
			var _level$details;
			if ((_level$details = level.details) != null && _level$details.hasKey(keyInError)) return true;
			const audioGroupsIds = level.audioGroups;
			if (audioGroupsIds) return this.hls.allAudioTracks.filter((track) => audioGroupsIds.indexOf(track.groupId) >= 0).some((track) => {
				var _track$details;
				return (_track$details = track.details) == null ? void 0 : _track$details.hasKey(keyInError);
			});
		}
		return false;
	}
	onManifestLoading() {
		this.playlistError = 0;
	}
	onLevelUpdated() {
		this.playlistError = 0;
	}
	onError(event, data) {
		var _data$frag;
		if (data.fatal) return;
		const hls = this.hls;
		const context = data.context;
		switch (data.details) {
			case ErrorDetails.FRAG_LOAD_ERROR:
			case ErrorDetails.FRAG_LOAD_TIMEOUT:
			case ErrorDetails.KEY_LOAD_ERROR:
			case ErrorDetails.KEY_LOAD_TIMEOUT:
				data.errorAction = this.getFragRetryOrSwitchAction(data);
				return;
			case ErrorDetails.FRAG_PARSING_ERROR: if ((_data$frag = data.frag) != null && _data$frag.gap) {
				data.errorAction = createDoNothingErrorAction();
				return;
			}
			case ErrorDetails.FRAG_GAP:
			case ErrorDetails.FRAG_DECRYPT_ERROR:
				data.errorAction = this.getFragRetryOrSwitchAction(data);
				data.errorAction.action = NetworkErrorAction.SendAlternateToPenaltyBox;
				return;
			case ErrorDetails.PLAYLIST_UNCHANGED_ERROR:
			case ErrorDetails.LEVEL_EMPTY_ERROR:
			case ErrorDetails.LEVEL_PARSING_ERROR:
				{
					var _data$context;
					const levelIndex = data.parent === PlaylistLevelType.MAIN ? data.level : hls.loadLevel;
					if (data.details === ErrorDetails.LEVEL_EMPTY_ERROR && !!((_data$context = data.context) != null && (_data$context = _data$context.levelDetails) != null && _data$context.live)) data.errorAction = this.getPlaylistRetryOrSwitchAction(data, levelIndex);
					else {
						data.levelRetry = false;
						data.errorAction = this.getLevelSwitchAction(data, levelIndex);
					}
				}
				return;
			case ErrorDetails.LEVEL_LOAD_ERROR:
			case ErrorDetails.LEVEL_LOAD_TIMEOUT:
				if (typeof (context == null ? void 0 : context.level) === "number") data.errorAction = this.getPlaylistRetryOrSwitchAction(data, context.level);
				return;
			case ErrorDetails.AUDIO_TRACK_LOAD_ERROR:
			case ErrorDetails.AUDIO_TRACK_LOAD_TIMEOUT:
			case ErrorDetails.SUBTITLE_LOAD_ERROR:
			case ErrorDetails.SUBTITLE_TRACK_LOAD_TIMEOUT:
				if (context) {
					const level = hls.loadLevelObj;
					if (level && (context.type === LoaderContextType.AUDIO_TRACK && level.hasAudioGroup(context.groupId) || context.type === LoaderContextType.SUBTITLE_TRACK && level.hasSubtitleGroup(context.groupId))) {
						data.errorAction = this.getPlaylistRetryOrSwitchAction(data, hls.loadLevel);
						data.errorAction.action = NetworkErrorAction.SendAlternateToPenaltyBox;
						data.errorAction.flags = ErrorActionFlags.MoveAllAlternatesMatchingHost;
						return;
					}
				}
				return;
			case ErrorDetails.KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED:
				data.errorAction = {
					action: NetworkErrorAction.SendAlternateToPenaltyBox,
					flags: ErrorActionFlags.MoveAllAlternatesMatchingHDCP
				};
				return;
			case ErrorDetails.KEY_SYSTEM_SESSION_UPDATE_FAILED:
			case ErrorDetails.KEY_SYSTEM_STATUS_INTERNAL_ERROR:
			case ErrorDetails.KEY_SYSTEM_NO_SESSION:
				data.errorAction = {
					action: NetworkErrorAction.SendAlternateToPenaltyBox,
					flags: ErrorActionFlags.MoveAllAlternatesMatchingKey
				};
				return;
			case ErrorDetails.BUFFER_ADD_CODEC_ERROR:
			case ErrorDetails.REMUX_ALLOC_ERROR:
			case ErrorDetails.BUFFER_APPEND_ERROR:
				if (!data.errorAction) data.errorAction = this.getLevelSwitchAction(data, data.level);
				return;
			case ErrorDetails.MEDIA_SOURCE_REQUIRES_RESET:
				if (!data.errorAction) data.errorAction = this.getLevelSwitchAction(data, data.level);
				data.errorAction.flags |= ErrorActionFlags.ResetMediaSource | ErrorActionFlags.SwitchToSDR;
				return;
			case ErrorDetails.INTERNAL_EXCEPTION:
			case ErrorDetails.BUFFER_APPENDING_ERROR:
			case ErrorDetails.BUFFER_APPEND_NO_PROGRESS:
			case ErrorDetails.BUFFER_FULL_ERROR:
			case ErrorDetails.LEVEL_SWITCH_ERROR:
			case ErrorDetails.BUFFER_STALLED_ERROR:
			case ErrorDetails.BUFFER_SEEK_OVER_HOLE:
			case ErrorDetails.BUFFER_NUDGE_ON_STALL:
				data.errorAction = createDoNothingErrorAction();
				return;
		}
		if (data.type === ErrorTypes.KEY_SYSTEM_ERROR) {
			data.levelRetry = false;
			data.errorAction = createDoNothingErrorAction();
		}
	}
	getPlaylistRetryOrSwitchAction(data, levelIndex) {
		const hls = this.hls;
		const retryConfig = getRetryConfig(hls.config.playlistLoadPolicy, data);
		const retryCount = this.playlistError++;
		if (shouldRetry(retryConfig, retryCount, isTimeoutError(data), data.response)) return {
			action: NetworkErrorAction.RetryRequest,
			flags: ErrorActionFlags.None,
			retryConfig,
			retryCount
		};
		const errorAction = this.getLevelSwitchAction(data, levelIndex);
		if (retryConfig) {
			errorAction.retryConfig = retryConfig;
			errorAction.retryCount = retryCount;
		}
		return errorAction;
	}
	getFragRetryOrSwitchAction(data) {
		const hls = this.hls;
		const variantLevelIndex = this.getVariantLevelIndex(data.frag);
		const level = hls.levels[variantLevelIndex];
		const { fragLoadPolicy, keyLoadPolicy } = hls.config;
		const retryConfig = getRetryConfig(isKeyError(data) ? keyLoadPolicy : fragLoadPolicy, data);
		const fragmentErrors = hls.levels.reduce((acc, level) => acc + level.fragmentError, 0);
		if (level) {
			if (data.details !== ErrorDetails.FRAG_GAP) level.fragmentError++;
			if (!isUnusableKeyError(data)) {
				if (shouldRetry(retryConfig, fragmentErrors, isTimeoutError(data), data.response)) return {
					action: NetworkErrorAction.RetryRequest,
					flags: ErrorActionFlags.None,
					retryConfig,
					retryCount: fragmentErrors
				};
			}
		}
		const errorAction = this.getLevelSwitchAction(data, variantLevelIndex);
		if (retryConfig) {
			errorAction.retryConfig = retryConfig;
			errorAction.retryCount = fragmentErrors;
		}
		return errorAction;
	}
	getLevelSwitchAction(data, levelIndex) {
		const hls = this.hls;
		if (levelIndex === null || levelIndex === void 0) levelIndex = hls.loadLevel;
		const level = this.hls.levels[levelIndex];
		if (level) {
			var _data$frag2, _data$context2;
			const errorDetails = data.details;
			level.loadError++;
			level.loadErrorTime = self.performance.now();
			if (errorDetails === ErrorDetails.BUFFER_APPEND_ERROR) level.fragmentError++;
			let nextLevel = -1;
			const { levels, loadLevel, minAutoLevel, maxAutoLevel } = hls;
			if (!hls.autoLevelEnabled && !hls.config.preserveManualLevelOnError) hls.loadLevel = -1;
			const fragErrorType = (_data$frag2 = data.frag) == null ? void 0 : _data$frag2.type;
			const findAudioCodecAlternate = (fragErrorType === PlaylistLevelType.AUDIO && errorDetails === ErrorDetails.FRAG_PARSING_ERROR || data.sourceBufferName === "audio" && isCodecRelated(data)) && levels.some(({ audioCodec }) => level.audioCodec !== audioCodec);
			const findVideoCodecAlternate = data.sourceBufferName === "video" && isCodecRelated(data) && levels.some(({ codecSet, audioCodec }) => level.codecSet !== codecSet && level.audioCodec === audioCodec);
			const { type: playlistErrorType, groupId: playlistErrorGroupId } = (_data$context2 = data.context) != null ? _data$context2 : {};
			for (let i = levels.length; i--;) {
				const candidate = (i + loadLevel) % levels.length;
				if (candidate !== loadLevel && candidate >= minAutoLevel && candidate <= maxAutoLevel && (levels[candidate].loadError === 0 || isPenaltyExpired(levels[candidate], hls.config.errorPenaltyExpireMs))) {
					var _level$audioGroups, _level$subtitleGroups;
					const levelCandidate = levels[candidate];
					if (errorDetails === ErrorDetails.FRAG_GAP && fragErrorType === PlaylistLevelType.MAIN && data.frag) {
						const levelDetails = levels[candidate].details;
						if (levelDetails) {
							const fragCandidate = findFragmentByPTS(data.frag, levelDetails.fragments, data.frag.start);
							if (fragCandidate != null && fragCandidate.gap) continue;
						}
					} else if (playlistErrorType === LoaderContextType.AUDIO_TRACK && levelCandidate.hasAudioGroup(playlistErrorGroupId) || playlistErrorType === LoaderContextType.SUBTITLE_TRACK && levelCandidate.hasSubtitleGroup(playlistErrorGroupId)) continue;
					else if (fragErrorType === PlaylistLevelType.AUDIO && (_level$audioGroups = level.audioGroups) != null && _level$audioGroups.some((groupId) => levelCandidate.hasAudioGroup(groupId)) || fragErrorType === PlaylistLevelType.SUBTITLE && (_level$subtitleGroups = level.subtitleGroups) != null && _level$subtitleGroups.some((groupId) => levelCandidate.hasSubtitleGroup(groupId)) || findAudioCodecAlternate && level.audioCodec === levelCandidate.audioCodec || findVideoCodecAlternate && level.codecSet === levelCandidate.codecSet || !findAudioCodecAlternate && level.audioCodec !== levelCandidate.audioCodec) continue;
					nextLevel = candidate;
					break;
				}
			}
			if (nextLevel > -1 && hls.loadLevel !== nextLevel) {
				data.levelRetry = true;
				this.playlistError = 0;
				return {
					action: NetworkErrorAction.SendAlternateToPenaltyBox,
					flags: ErrorActionFlags.None,
					nextAutoLevel: nextLevel
				};
			}
		}
		return {
			action: NetworkErrorAction.SendAlternateToPenaltyBox,
			flags: ErrorActionFlags.MoveAllAlternatesMatchingHost
		};
	}
	onErrorOut(event, data) {
		var _data$errorAction, _data$errorAction2;
		switch ((_data$errorAction = data.errorAction) == null ? void 0 : _data$errorAction.action) {
			case NetworkErrorAction.DoNothing: break;
			case NetworkErrorAction.SendAlternateToPenaltyBox:
				this.sendAlternateToPenaltyBox(data);
				if (!data.errorAction.resolved && data.details !== ErrorDetails.FRAG_GAP && data.details !== ErrorDetails.PLAYLIST_UNCHANGED_ERROR && !isAppendStateRelated(data)) data.fatal = true;
				break;
			case NetworkErrorAction.RetryRequest:
		}
		if ((((_data$errorAction2 = data.errorAction) == null ? void 0 : _data$errorAction2.flags) || 0) & ErrorActionFlags.ResetMediaSource) this.hls.recoverMediaError();
		if (data.fatal) {
			this.hls.stopLoad();
			return;
		}
	}
	sendAlternateToPenaltyBox(data) {
		const hls = this.hls;
		const errorAction = data.errorAction;
		if (!errorAction) return;
		let nextAutoLevel = errorAction.nextAutoLevel;
		if (errorAction.flags === ErrorActionFlags.None) this.switchLevel(data, nextAutoLevel);
		else if (errorAction.flags & ErrorActionFlags.SwitchToSDR) {
			const levels = this.hls.levels;
			const levelCountWithError = levels.length;
			for (let i = levelCountWithError; i--;) if (levels[i].videoRange !== "SDR") {
				levels[i].fragmentError++;
				levels[i].loadError++;
			} else if (nextAutoLevel === void 0) nextAutoLevel = i;
		} else if (errorAction.flags & ErrorActionFlags.MoveAllAlternatesMatchingHDCP) {
			const levelIndex = this.getVariantLevelIndex(data.frag);
			const level = hls.levels[levelIndex];
			const restrictedHdcpLevel = level == null ? void 0 : level.attrs["HDCP-LEVEL"];
			errorAction.hdcpLevel = restrictedHdcpLevel;
			const restrictedOutputErrorWhileNoneDeclared = restrictedHdcpLevel === "NONE";
			if (restrictedHdcpLevel && !restrictedOutputErrorWhileNoneDeclared) {
				hls.maxHdcpLevel = HdcpLevels[HdcpLevels.indexOf(restrictedHdcpLevel) - 1];
				errorAction.resolved = true;
				this.warn(`Restricting playback to HDCP-LEVEL of "${hls.maxHdcpLevel}" or lower`);
			} else {
				if (restrictedOutputErrorWhileNoneDeclared) this.warn(`HDCP policy resticted output with HDCP-LEVEL=NONE`);
				errorAction.flags |= ErrorActionFlags.MoveAllAlternatesMatchingKey;
			}
		}
		if (errorAction.flags & ErrorActionFlags.MoveAllAlternatesMatchingKey) {
			const levelKey = data.decryptdata;
			if (levelKey) {
				const levels = this.hls.levels;
				const levelCountWithError = levels.length;
				for (let i = levelCountWithError; i--;) if (this.variantHasKey(levels[i], levelKey)) {
					var _levels$i$audioGroups, _data$frag3;
					this.log(`Banned key found in level ${i} (${levels[i].bitrate}bps) or audio group "${(_levels$i$audioGroups = levels[i].audioGroups) == null ? void 0 : _levels$i$audioGroups.join(",")}" (${(_data$frag3 = data.frag) == null ? void 0 : _data$frag3.type} fragment) ${arrayToHex(levelKey.keyId || [])}`);
					levels[i].fragmentError++;
					levels[i].loadError++;
					this.log(`Removing level ${i} with key error (${data.error})`);
					this.hls.removeLevel(i);
				}
				const frag = data.frag;
				if (this.hls.levels.length < levelCountWithError) errorAction.resolved = true;
				else if (frag && frag.type !== PlaylistLevelType.MAIN) {
					const fragLevelKey = frag.decryptdata;
					if (fragLevelKey && !levelKey.matches(fragLevelKey)) errorAction.resolved = true;
				}
			}
		}
		if (!errorAction.resolved) this.switchLevel(data, nextAutoLevel);
	}
	switchLevel(data, levelIndex) {
		if (levelIndex !== void 0 && data.errorAction) {
			this.warn(`switching to level ${levelIndex} after ${data.details}`);
			this.hls.nextAutoLevel = levelIndex;
			data.errorAction.resolved = true;
			this.hls.nextLoadLevel = this.hls.nextAutoLevel;
			if (data.details === ErrorDetails.BUFFER_ADD_CODEC_ERROR && data.mimeType && data.sourceBufferName !== "audiovideo") {
				const codec = getCodecsForMimeType(data.mimeType);
				const levels = this.hls.levels;
				for (let i = levels.length; i--;) if (levels[i][`${data.sourceBufferName}Codec`] === codec) {
					this.log(`Removing level ${i} for ${data.details} ("${codec}" not supported)`);
					this.hls.removeLevel(i);
				}
			}
		}
	}
};
function isCodecRelated(data) {
	const errorDetails = data.details;
	if (errorDetails === ErrorDetails.BUFFER_ADD_CODEC_ERROR || errorDetails === ErrorDetails.MEDIA_SOURCE_REQUIRES_RESET) return true;
	if (errorDetails === ErrorDetails.BUFFER_APPEND_ERROR) {
		if (!isAppendStateRelated(data)) return true;
	}
	return false;
}
function isAppendStateRelated(data) {
	return data.details === ErrorDetails.BUFFER_APPEND_ERROR && (data.error.name === "QuotaExceededError" || data.error.name === "InvalidStateError");
}
function createDoNothingErrorAction(resolved) {
	const errorAction = {
		action: NetworkErrorAction.DoNothing,
		flags: ErrorActionFlags.None
	};
	if (resolved) errorAction.resolved = true;
	return errorAction;
}
var DECIMAL_RESOLUTION_REGEX = /^(\d+)x(\d+)$/;
var ATTR_LIST_REGEX = /(.+?)=(".*?"|.*?)(?:,|$)/g;
var AttrList = class AttrList {
	constructor(attrs, parsed) {
		if (typeof attrs === "string") attrs = AttrList.parseAttrList(attrs, parsed);
		_extends(this, attrs);
	}
	get clientAttrs() {
		return Object.keys(this).filter((attr) => attr.substring(0, 2) === "X-");
	}
	decimalInteger(attrName) {
		const intValue = parseInt(this[attrName], 10);
		if (intValue > Number.MAX_SAFE_INTEGER) return Infinity;
		return intValue;
	}
	hexadecimalInteger(attrName) {
		if (this[attrName]) {
			let stringValue = (this[attrName] || "0x").slice(2);
			stringValue = (stringValue.length & 1 ? "0" : "") + stringValue;
			const value = new Uint8Array(stringValue.length / 2);
			for (let i = 0; i < stringValue.length / 2; i++) value[i] = parseInt(stringValue.slice(i * 2, i * 2 + 2), 16);
			return value;
		}
		return null;
	}
	hexadecimalIntegerAsNumber(attrName) {
		const intValue = parseInt(this[attrName], 16);
		if (intValue > Number.MAX_SAFE_INTEGER) return Infinity;
		return intValue;
	}
	decimalFloatingPoint(attrName) {
		return parseFloat(this[attrName]);
	}
	optionalFloat(attrName, defaultValue) {
		const value = this[attrName];
		return value ? parseFloat(value) : defaultValue;
	}
	enumeratedString(attrName) {
		return this[attrName];
	}
	enumeratedStringList(attrName, dict) {
		const attrValue = this[attrName];
		return (attrValue ? attrValue.split(/[ ,]+/) : []).reduce((result, identifier) => {
			result[identifier.toLowerCase()] = true;
			return result;
		}, dict);
	}
	bool(attrName) {
		return this[attrName] === "YES";
	}
	decimalResolution(attrName) {
		const res = DECIMAL_RESOLUTION_REGEX.exec(this[attrName]);
		if (res === null) return;
		return {
			width: parseInt(res[1], 10),
			height: parseInt(res[2], 10)
		};
	}
	static parseAttrList(input, parsed) {
		let match;
		const attrs = {};
		const quote = "\"";
		ATTR_LIST_REGEX.lastIndex = 0;
		while ((match = ATTR_LIST_REGEX.exec(input)) !== null) {
			const name = match[1].trim();
			let value = match[2];
			const quotedString = value.indexOf(quote) === 0 && value.lastIndexOf(quote) === value.length - 1;
			let hexadecimalSequence = false;
			if (quotedString) value = value.slice(1, -1);
			else switch (name) {
				case "IV":
				case "SCTE35-CMD":
				case "SCTE35-IN":
				case "SCTE35-OUT": hexadecimalSequence = true;
			}
			if (parsed && (quotedString || hexadecimalSequence));
			else if (!hexadecimalSequence && !quotedString) switch (name) {
				case "CLOSED-CAPTIONS": if (value === "NONE") break;
				case "ALLOWED-CPC":
				case "CLASS":
				case "ASSOC-LANGUAGE":
				case "AUDIO":
				case "BYTERANGE":
				case "CHANNELS":
				case "CHARACTERISTICS":
				case "CODECS":
				case "DATA-ID":
				case "END-DATE":
				case "GROUP-ID":
				case "ID":
				case "IMPORT":
				case "INSTREAM-ID":
				case "KEYFORMAT":
				case "KEYFORMATVERSIONS":
				case "LANGUAGE":
				case "NAME":
				case "PATHWAY-ID":
				case "QUERYPARAM":
				case "RECENTLY-REMOVED-DATERANGES":
				case "SERVER-URI":
				case "STABLE-RENDITION-ID":
				case "STABLE-VARIANT-ID":
				case "START-DATE":
				case "SUBTITLES":
				case "SUPPLEMENTAL-CODECS":
				case "URI":
				case "VALUE":
				case "VIDEO":
				case "X-ASSET-LIST":
				case "X-ASSET-URI": logger.warn(`${input}: attribute ${name} is missing quotes`);
			}
			attrs[name] = value;
		}
		return attrs;
	}
};
var CLASS_INTERSTITIAL = "com.apple.hls.interstitial";
function isDateRangeCueAttribute(attrName) {
	return attrName !== "ID" && attrName !== "CLASS" && attrName !== "CUE" && attrName !== "START-DATE" && attrName !== "DURATION" && attrName !== "END-DATE" && attrName !== "END-ON-NEXT";
}
function isSCTE35Attribute(attrName) {
	return attrName === "SCTE35-OUT" || attrName === "SCTE35-IN" || attrName === "SCTE35-CMD";
}
var DateRange = class {
	constructor(dateRangeAttr, dateRangeWithSameId, tagCount = 0) {
		var _dateRangeWithSameId$;
		this.attr = void 0;
		this.tagAnchor = void 0;
		this.tagOrder = void 0;
		this._startDate = void 0;
		this._endDate = void 0;
		this._dateAtEnd = void 0;
		this._cue = void 0;
		this._badValueForSameId = void 0;
		this.tagAnchor = (dateRangeWithSameId == null ? void 0 : dateRangeWithSameId.tagAnchor) || null;
		this.tagOrder = (_dateRangeWithSameId$ = dateRangeWithSameId == null ? void 0 : dateRangeWithSameId.tagOrder) != null ? _dateRangeWithSameId$ : tagCount;
		if (dateRangeWithSameId) {
			const previousAttr = dateRangeWithSameId.attr;
			for (const key in previousAttr) if (Object.prototype.hasOwnProperty.call(dateRangeAttr, key) && dateRangeAttr[key] !== previousAttr[key]) {
				logger.warn(`DATERANGE tag attribute: "${key}" does not match for tags with ID: "${dateRangeAttr.ID}"`);
				this._badValueForSameId = key;
				break;
			}
			dateRangeAttr = _extends(new AttrList({}), previousAttr, dateRangeAttr);
		}
		this.attr = dateRangeAttr;
		if (dateRangeWithSameId) {
			this._startDate = dateRangeWithSameId._startDate;
			this._cue = dateRangeWithSameId._cue;
			this._endDate = dateRangeWithSameId._endDate;
			this._dateAtEnd = dateRangeWithSameId._dateAtEnd;
		} else this._startDate = new Date(dateRangeAttr["START-DATE"]);
		if ("END-DATE" in dateRangeAttr) {
			const endDate = (dateRangeWithSameId == null ? void 0 : dateRangeWithSameId.endDate) || new Date(dateRangeAttr["END-DATE"]);
			if (isFiniteNumber(endDate.getTime())) this._endDate = endDate;
		}
	}
	get id() {
		return this.attr.ID;
	}
	get class() {
		return this.attr.CLASS;
	}
	get cue() {
		const _cue = this._cue;
		if (_cue === void 0) return this._cue = this.attr.enumeratedStringList(this.attr.CUE ? "CUE" : "X-CUE", {
			pre: false,
			post: false,
			once: false
		});
		return _cue;
	}
	get startTime() {
		const { tagAnchor } = this;
		if (tagAnchor === null || tagAnchor.programDateTime === null) {
			logger.warn(`Expected tagAnchor Fragment with PDT set for DateRange "${this.id}": ${tagAnchor}`);
			return NaN;
		}
		return tagAnchor.start + (this.startDate.getTime() - tagAnchor.programDateTime) / 1e3;
	}
	get startDate() {
		return this._startDate;
	}
	get endDate() {
		const dateAtEnd = this._endDate || this._dateAtEnd;
		if (dateAtEnd) return dateAtEnd;
		const duration = this.duration;
		if (duration !== null) return this._dateAtEnd = new Date(this._startDate.getTime() + duration * 1e3);
		return null;
	}
	get duration() {
		if ("DURATION" in this.attr) {
			const duration = this.attr.decimalFloatingPoint("DURATION");
			if (isFiniteNumber(duration)) return duration;
		} else if (this._endDate) return (this._endDate.getTime() - this._startDate.getTime()) / 1e3;
		return null;
	}
	get plannedDuration() {
		if ("PLANNED-DURATION" in this.attr) return this.attr.decimalFloatingPoint("PLANNED-DURATION");
		return null;
	}
	get endOnNext() {
		return this.attr.bool("END-ON-NEXT");
	}
	get isInterstitial() {
		return this.class === CLASS_INTERSTITIAL;
	}
	get isValid() {
		return !!this.id && !this._badValueForSameId && isFiniteNumber(this.startDate.getTime()) && (this.duration === null || this.duration >= 0) && (!this.endOnNext || !!this.class) && (!this.attr.CUE || !this.cue.pre && !this.cue.post || this.cue.pre !== this.cue.post) && (!this.isInterstitial || "X-ASSET-URI" in this.attr || "X-ASSET-LIST" in this.attr);
	}
	get invalidReason() {
		if (!this.id) return "Missing ID";
		if (this._badValueForSameId) return `Date range ${this._badValueForSameId} mismatch`;
		if (!isFiniteNumber(this.startDate.getTime())) return "Date range invalid start date";
		if (this.isInterstitial && !("X-ASSET-URI" in this.attr || "X-ASSET-LIST" in this.attr)) return "Interstitial Date range missing X-ASSET-(LIST|URI)";
		if (!this.isValid) return "Unknown (check DURATION(|END|NEXT), CLASS, and CUE)";
		return null;
	}
};
var DEFAULT_TARGET_DURATION = 10;
/**
* Object representing parsed data from an HLS Media Playlist. Found in {@link hls.js#Level.details}.
*/
var LevelDetails = class {
	constructor(baseUrl) {
		this.PTSKnown = false;
		this.alignedSliding = false;
		this.averagetargetduration = void 0;
		this.endCC = 0;
		this.endSN = 0;
		this.fragments = void 0;
		this.fragmentHint = void 0;
		this.partList = null;
		this.dateRanges = void 0;
		this.dateRangeTagCount = 0;
		this.live = true;
		this.iframesOnly = false;
		this.requestScheduled = -1;
		this.ageHeader = 0;
		this.advancedDateTime = void 0;
		this.updated = true;
		this.advanced = true;
		this.misses = 0;
		this.startCC = 0;
		this.startSN = 0;
		this.startTimeOffset = null;
		this.targetduration = 0;
		this.totalduration = 0;
		this.type = null;
		this.url = void 0;
		this.m3u8 = "";
		this.version = null;
		this.canBlockReload = false;
		this.canSkipUntil = 0;
		this.canSkipDateRanges = false;
		this.skippedSegments = 0;
		this.recentlyRemovedDateranges = void 0;
		this.partHoldBack = 0;
		this.holdBack = 0;
		this.partTarget = 0;
		this.preloadHint = void 0;
		this.renditionReports = void 0;
		this.tuneInGoal = 0;
		this.deltaUpdateFailed = void 0;
		this.driftStartTime = 0;
		this.driftEndTime = 0;
		this.driftStart = 0;
		this.driftEnd = 0;
		this.encryptedFragments = void 0;
		this.playlistParsingError = null;
		this.variableList = null;
		this.hasVariableRefs = false;
		this.appliedTimelineOffset = void 0;
		this.fragments = [];
		this.encryptedFragments = [];
		this.dateRanges = {};
		this.url = baseUrl;
	}
	reloaded(previous) {
		if (!previous) {
			this.advanced = true;
			this.updated = true;
			return;
		}
		const partSnDiff = this.lastPartSn - previous.lastPartSn;
		const partIndexDiff = this.lastPartIndex - previous.lastPartIndex;
		this.updated = this.endSN !== previous.endSN || !!partIndexDiff || !!partSnDiff || !this.live;
		this.advanced = this.endSN > previous.endSN || partSnDiff > 0 || partSnDiff === 0 && partIndexDiff > 0;
		if (this.updated || this.advanced) this.misses = 0;
		else this.misses = previous.misses + 1;
	}
	hasKey(levelKey) {
		return this.encryptedFragments.some((frag) => {
			let decryptdata = frag.decryptdata;
			if (!decryptdata) {
				frag.setKeyFormat(levelKey.keyFormat);
				decryptdata = frag.decryptdata;
			}
			return !!decryptdata && levelKey.matches(decryptdata);
		});
	}
	get hasProgramDateTime() {
		if (this.fragments.length) return isFiniteNumber(this.fragments[this.fragments.length - 1].programDateTime);
		return false;
	}
	get levelTargetDuration() {
		return this.averagetargetduration || this.targetduration || DEFAULT_TARGET_DURATION;
	}
	get drift() {
		const runTime = this.driftEndTime - this.driftStartTime;
		if (runTime > 0) return (this.driftEnd - this.driftStart) * 1e3 / runTime;
		return 1;
	}
	get edge() {
		return this.partEnd || this.fragmentEnd;
	}
	get partEnd() {
		var _this$partList;
		if ((_this$partList = this.partList) != null && _this$partList.length) return this.partList[this.partList.length - 1].end;
		return this.fragmentEnd;
	}
	get fragmentEnd() {
		if (this.fragments.length) return this.fragments[this.fragments.length - 1].end;
		return 0;
	}
	get fragmentStart() {
		if (this.fragments.length) return this.fragments[0].start;
		return 0;
	}
	get age() {
		if (this.advancedDateTime) return Math.max(Date.now() - this.advancedDateTime, 0) / 1e3;
		return 0;
	}
	get lastPartIndex() {
		var _this$partList2;
		if ((_this$partList2 = this.partList) != null && _this$partList2.length) return this.partList[this.partList.length - 1].index;
		return -1;
	}
	get maxPartIndex() {
		const partList = this.partList;
		if (partList) {
			const lastIndex = this.lastPartIndex;
			if (lastIndex !== -1) {
				for (let i = partList.length; i--;) if (partList[i].index > lastIndex) return partList[i].index;
				return lastIndex;
			}
		}
		return 0;
	}
	get lastPartSn() {
		var _this$partList3;
		if ((_this$partList3 = this.partList) != null && _this$partList3.length) return this.partList[this.partList.length - 1].fragment.sn;
		return this.endSN;
	}
	get expired() {
		if (this.live && this.advancedDateTime !== void 0 && this.misses < 3) {
			const playlistWindowDuration = this.partEnd - this.fragmentStart;
			return this.age > Math.max(playlistWindowDuration, this.totalduration) + this.levelTargetDuration;
		}
		return false;
	}
	get partsExpired() {
		if (this.live && this.partTarget && this.advancedDateTime !== void 0 && this.misses < 3) return this.age > (this.partHoldBack || this.partTarget * 3) * 1.5;
		return false;
	}
};
function arrayValuesMatch(a, b) {
	if (a.length === b.length) return !a.some((value, i) => value !== b[i]);
	return false;
}
function optionalArrayValuesMatch(a, b) {
	if (!a && !b) return true;
	if (!a || !b) return false;
	return arrayValuesMatch(a, b);
}
var DecrypterAesMode = {
	cbc: 0,
	ctr: 1
};
function isFullSegmentEncryption(method) {
	return method === "AES-128" || method === "AES-256" || method === "AES-256-CTR";
}
function getAesModeFromFullSegmentMethod(method) {
	switch (method) {
		case "AES-128":
		case "AES-256": return DecrypterAesMode.cbc;
		case "AES-256-CTR": return DecrypterAesMode.ctr;
		default: throw new Error(`invalid full segment method ${method}`);
	}
}
var keyUriToKeyIdMap = {};
var LevelKey = class LevelKey {
	static clearKeyUriToKeyIdMap() {
		keyUriToKeyIdMap = {};
	}
	static setKeyIdForUri(uri, keyId) {
		keyUriToKeyIdMap[uri] = keyId;
	}
	static addKeyIdForUri(uri) {
		const val = Object.keys(keyUriToKeyIdMap).length % Number.MAX_SAFE_INTEGER;
		const keyId = /* @__PURE__ */ new Uint8Array(16);
		new DataView(keyId.buffer, 12, 4).setUint32(0, val);
		keyUriToKeyIdMap[uri] = keyId;
		return keyId;
	}
	constructor(method, uri, format, formatversions = [1], iv = null, keyId) {
		this.uri = void 0;
		this.method = void 0;
		this.keyFormat = void 0;
		this.keyFormatVersions = void 0;
		this.encrypted = void 0;
		this.isCommonEncryption = void 0;
		this.iv = null;
		this.key = null;
		this.keyId = null;
		this.pssh = null;
		this.scheme = void 0;
		this.method = method;
		this.uri = uri;
		this.keyFormat = format;
		this.keyFormatVersions = formatversions;
		this.iv = iv;
		this.encrypted = method ? method !== "NONE" : false;
		this.isCommonEncryption = this.encrypted && !isFullSegmentEncryption(method);
		if (keyId != null && keyId.startsWith("0x")) this.keyId = new Uint8Array(hexToArrayBuffer(keyId));
	}
	matches(key) {
		return key.uri === this.uri && key.method === this.method && key.encrypted === this.encrypted && key.keyFormat === this.keyFormat && arrayValuesMatch(key.keyFormatVersions, this.keyFormatVersions) && optionalArrayValuesMatch(key.iv, this.iv) && optionalArrayValuesMatch(key.keyId, this.keyId);
	}
	isSupported() {
		if (this.method) {
			if (isFullSegmentEncryption(this.method) || this.method === "NONE") return true;
			if (this.keyFormat === "identity") return this.method === "SAMPLE-AES";
		}
		return false;
	}
	getDecryptData(sn, levelKeys) {
		if (!this.encrypted || !this.uri) return null;
		if (isFullSegmentEncryption(this.method)) {
			let iv = this.iv;
			if (!iv) {
				if (typeof sn !== "number") {
					logger.warn(`missing IV for initialization segment with method="${this.method}" - compliance issue`);
					sn = 0;
				}
				iv = createInitializationVector(sn);
			}
			return new LevelKey(this.method, this.uri, "identity", this.keyFormatVersions, iv);
		}
		return this;
	}
};
function createInitializationVector(segmentNumber) {
	const uint8View = /* @__PURE__ */ new Uint8Array(16);
	for (let i = 12; i < 16; i++) uint8View[i] = segmentNumber >> 8 * (15 - i) & 255;
	return uint8View;
}
var MASTER_PLAYLIST_REGEX = /#EXT-X-STREAM-INF:([^\r\n]*)(?:[\r\n](?:#[^\r\n]*)?)*([^\r\n]+)|#EXT-X-(I-FRAME-STREAM-INF|SESSION-DATA|SESSION-KEY|DEFINE|CONTENT-STEERING|START):([^\r\n]*)(?:[\r\n]+|$)/g;
var MASTER_PLAYLIST_MEDIA_REGEX = /#EXT-X-MEDIA:(.*)/g;
var IS_MEDIA_PLAYLIST = /^#EXT(?:INF|-X-TARGETDURATION):/m;
var LEVEL_PLAYLIST_REGEX_FAST = new RegExp([
	/#EXTINF:\s*(\d+(?:\.\d*)?|\.\d+)?(?:,(.*)\s+)?/.source,
	/(?!#) *(\S[^\r\n]*)/.source,
	/#.*/.source
].join("|"), "g");
var LEVEL_PLAYLIST_REGEX_SLOW = new RegExp([
	/#EXT-X-(PROGRAM-DATE-TIME|BYTERANGE|DATERANGE|DEFINE|KEY|MAP|PART|PART-INF|PLAYLIST-TYPE|PRELOAD-HINT|RENDITION-REPORT|SERVER-CONTROL|SKIP|START):(.+)/.source,
	/#EXT-X-(BITRATE|DISCONTINUITY-SEQUENCE|MEDIA-SEQUENCE|TARGETDURATION|VERSION): *(\d+)/.source,
	/#EXT-X-(DISCONTINUITY|ENDLIST|GAP|INDEPENDENT-SEGMENTS|I-FRAMES-ONLY)/.source,
	/(#)([^:]*):(.*)/.source,
	/(#)(.*)(?:.*)\r?\n?/.source
].join("|"));
var M3U8Parser = class M3U8Parser {
	static findGroup(groups, mediaGroupId) {
		for (let i = 0; i < groups.length; i++) {
			const group = groups[i];
			if (group.id === mediaGroupId) return group;
		}
	}
	static resolve(url, baseUrl) {
		return urlToolkitExports.buildAbsoluteURL(baseUrl, url, { alwaysNormalize: true });
	}
	static isMediaPlaylist(str) {
		return IS_MEDIA_PLAYLIST.test(str);
	}
	static parseMasterPlaylist(string, baseurl) {
		const parsed = {
			contentSteering: null,
			levels: [],
			iframeVariants: [],
			playlistParsingError: null,
			sessionData: null,
			sessionKeys: null,
			startTimeOffset: null,
			variableList: null,
			hasVariableRefs: false
		};
		const levelsWithKnownCodecs = [];
		MASTER_PLAYLIST_REGEX.lastIndex = 0;
		if (!string.startsWith("#EXTM3U")) {
			parsed.playlistParsingError = /* @__PURE__ */ new Error("no EXTM3U delimiter");
			return parsed;
		}
		let result;
		while ((result = MASTER_PLAYLIST_REGEX.exec(string)) != null) if (result[1]) {
			const level = createVariant(new AttrList(result[1], parsed), result[2], baseurl, parsed, levelsWithKnownCodecs);
			if (level) parsed.levels.push(level);
		} else if (result[3]) {
			const tag = result[3];
			const attributes = result[4];
			switch (tag) {
				case "I-FRAME-STREAM-INF":
					{
						const attrs = new AttrList(attributes, parsed);
						const iframeVariant = createVariant(attrs, attrs.URI, baseurl, parsed, levelsWithKnownCodecs, true);
						if (iframeVariant) parsed.iframeVariants.push(iframeVariant);
					}
					break;
				case "SESSION-DATA": {
					const sessionAttrs = new AttrList(attributes, parsed);
					const dataId = sessionAttrs["DATA-ID"];
					if (dataId) {
						if (parsed.sessionData === null) parsed.sessionData = {};
						parsed.sessionData[dataId] = sessionAttrs;
					}
					break;
				}
				case "SESSION-KEY": {
					const sessionKey = parseKey(attributes, baseurl, parsed);
					if (sessionKey.encrypted && sessionKey.isSupported()) {
						if (parsed.sessionKeys === null) parsed.sessionKeys = [];
						parsed.sessionKeys.push(sessionKey);
					} else logger.warn(`[Keys] Ignoring invalid EXT-X-SESSION-KEY tag: "${attributes}"`);
					break;
				}
				case "DEFINE": break;
				case "CONTENT-STEERING": {
					const contentSteeringAttributes = new AttrList(attributes, parsed);
					parsed.contentSteering = {
						uri: M3U8Parser.resolve(contentSteeringAttributes["SERVER-URI"], baseurl),
						pathwayId: contentSteeringAttributes["PATHWAY-ID"] || "."
					};
					break;
				}
				case "START": parsed.startTimeOffset = parseStartTimeOffset(attributes);
			}
		}
		parsed.levels = levelsWithKnownCodecs.length > 0 && levelsWithKnownCodecs.length < parsed.levels.length ? levelsWithKnownCodecs : parsed.levels;
		if (parsed.levels.length === 0) parsed.playlistParsingError = /* @__PURE__ */ new Error("no levels found in manifest");
		return parsed;
	}
	static parseMasterPlaylistMedia(string, baseurl, parsed) {
		let result;
		const results = {};
		const levels = parsed.levels;
		const groupsByType = {
			AUDIO: levels.map((level) => ({
				id: level.attrs.AUDIO,
				audioCodec: level.audioCodec
			})),
			SUBTITLES: levels.map((level) => ({
				id: level.attrs.SUBTITLES,
				textCodec: level.textCodec
			})),
			"CLOSED-CAPTIONS": []
		};
		let id = 0;
		MASTER_PLAYLIST_MEDIA_REGEX.lastIndex = 0;
		while ((result = MASTER_PLAYLIST_MEDIA_REGEX.exec(string)) !== null) {
			const attrs = new AttrList(result[1], parsed);
			const type = attrs.TYPE;
			if (type) {
				const groups = groupsByType[type];
				const medias = results[type] || [];
				results[type] = medias;
				const lang = attrs.LANGUAGE;
				const assocLang = attrs["ASSOC-LANGUAGE"];
				const channels = attrs.CHANNELS;
				const characteristics = attrs.CHARACTERISTICS;
				const instreamId = attrs["INSTREAM-ID"];
				const media = {
					attrs,
					bitrate: 0,
					id: id++,
					groupId: attrs["GROUP-ID"] || "",
					name: attrs.NAME || lang || "",
					type,
					default: attrs.bool("DEFAULT"),
					autoselect: attrs.bool("AUTOSELECT"),
					forced: attrs.bool("FORCED"),
					lang,
					url: attrs.URI ? M3U8Parser.resolve(attrs.URI, baseurl) : ""
				};
				if (assocLang) media.assocLang = assocLang;
				if (channels) media.channels = channels;
				if (characteristics) media.characteristics = characteristics;
				if (instreamId) media.instreamId = instreamId;
				if (groups != null && groups.length) {
					const groupCodec = M3U8Parser.findGroup(groups, media.groupId) || groups[0];
					assignCodec(media, groupCodec, "audioCodec");
					assignCodec(media, groupCodec, "textCodec");
				}
				medias.push(media);
			}
		}
		return results;
	}
	static parseLevelPlaylist(string, baseurl, id, type, levelUrlId, multivariantVariableList) {
		var _LEVEL_PLAYLIST_REGEX;
		const base = { url: baseurl };
		const level = new LevelDetails(baseurl);
		const fragments = level.fragments;
		const programDateTimes = [];
		let currentInitSegment = null;
		let currentSN = 0;
		let currentPart = 0;
		let totalduration = 0;
		let discontinuityCounter = 0;
		let currentBitrate = 0;
		let prevFrag = null;
		let frag = new Fragment(type, base);
		let result;
		let i;
		let levelkeys;
		let firstPdtIndex = -1;
		let createNextFrag = false;
		let nextByteRange = null;
		let serverControlAttrs;
		LEVEL_PLAYLIST_REGEX_FAST.lastIndex = 0;
		level.m3u8 = string;
		level.hasVariableRefs = false;
		if (((_LEVEL_PLAYLIST_REGEX = LEVEL_PLAYLIST_REGEX_FAST.exec(string)) == null ? void 0 : _LEVEL_PLAYLIST_REGEX[0]) !== "#EXTM3U") {
			level.playlistParsingError = /* @__PURE__ */ new Error("Missing format identifier #EXTM3U");
			return level;
		}
		while ((result = LEVEL_PLAYLIST_REGEX_FAST.exec(string)) !== null) {
			if (createNextFrag) {
				createNextFrag = false;
				frag = new Fragment(type, base);
				frag.playlistOffset = totalduration;
				frag.setStart(totalduration);
				frag.sn = currentSN;
				frag.cc = discontinuityCounter;
				if (currentBitrate) frag.bitrate = currentBitrate;
				frag.level = id;
				if (currentInitSegment) {
					frag.initSegment = currentInitSegment;
					if (currentInitSegment.rawProgramDateTime) {
						frag.rawProgramDateTime = currentInitSegment.rawProgramDateTime;
						currentInitSegment.rawProgramDateTime = null;
					}
					if (nextByteRange) {
						frag.setByteRange(nextByteRange);
						nextByteRange = null;
					}
				}
			}
			const duration = result[1];
			if (duration) {
				frag.duration = parseFloat(duration);
				const title = (" " + result[2]).slice(1);
				frag.title = title || null;
				frag.tagList.push(title ? [
					"INF",
					duration,
					title
				] : ["INF", duration]);
			} else if (result[3]) {
				if (isFiniteNumber(frag.duration)) {
					var _currentInitSegment;
					frag.playlistOffset = totalduration;
					frag.setStart(totalduration);
					if (levelkeys) setFragLevelKeys(frag, levelkeys, level);
					frag.sn = currentSN;
					frag.level = id;
					frag.cc = discontinuityCounter;
					const uri = (" " + result[3]).slice(1);
					frag.relurl = uri;
					assignProgramDateTime(frag, prevFrag, programDateTimes);
					prevFrag = frag;
					totalduration += frag.duration;
					currentSN++;
					currentPart = 0;
					const byteRange = frag.byteRange;
					if (byteRange.length === 2) frag.bitrate = (byteRange[1] - byteRange[0]) * 8 / frag.duration | 0;
					if (level.iframesOnly && byteRange[0] && ((_currentInitSegment = currentInitSegment) == null ? void 0 : _currentInitSegment.cc) !== discontinuityCounter) {
						const init = new Fragment(type, base);
						init.relurl = frag.relurl;
						init.setByteRange(`${Math.min(byteRange[0], 1316)}@0`);
						init.level = id;
						init.sn = "initSegment";
						if (levelkeys) {
							init.levelkeys = levelkeys;
							if (levelkeys.identity) init._decryptdata = levelkeys.identity.getDecryptData(0);
						}
						currentInitSegment = init;
						frag.initSegment = currentInitSegment;
					}
					fragments.push(frag);
					createNextFrag = true;
				}
			} else {
				result = result[0].match(LEVEL_PLAYLIST_REGEX_SLOW);
				if (!result) {
					logger.warn("No matches on slow regex match for level playlist!");
					continue;
				}
				for (i = 1; i < result.length; i++) if (result[i] !== void 0) break;
				const tag = (" " + result[i]).slice(1);
				const value1 = (" " + result[i + 1]).slice(1);
				const value2 = result[i + 2] ? (" " + result[i + 2]).slice(1) : null;
				switch (tag) {
					case "BYTERANGE":
						if (prevFrag) frag.setByteRange(value1, prevFrag);
						else frag.setByteRange(value1);
						break;
					case "PROGRAM-DATE-TIME":
						frag.rawProgramDateTime = value1;
						frag.tagList.push(["PROGRAM-DATE-TIME", value1]);
						if (firstPdtIndex === -1) firstPdtIndex = fragments.length;
						break;
					case "PLAYLIST-TYPE":
						if (level.type) assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
						level.type = value1.toUpperCase();
						break;
					case "MEDIA-SEQUENCE":
						if (level.startSN !== 0) assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
						else if (prevFrag !== null) assignMustAppearBeforeSegmentsError(level, tag, result);
						level.startSN = parseInt(value1);
						currentSN = level.startSN + level.skippedSegments;
						break;
					case "SKIP": {
						if (level.skippedSegments) assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
						const skipAttrs = new AttrList(value1, level);
						const skippedSegments = skipAttrs.decimalInteger("SKIPPED-SEGMENTS");
						if (isFiniteNumber(skippedSegments)) {
							level.skippedSegments += skippedSegments;
							for (let _i = skippedSegments; _i--;) fragments.push(null);
							currentSN += skippedSegments;
						}
						const recentlyRemovedDateranges = skipAttrs.enumeratedString("RECENTLY-REMOVED-DATERANGES");
						if (recentlyRemovedDateranges) level.recentlyRemovedDateranges = (level.recentlyRemovedDateranges || []).concat(recentlyRemovedDateranges.split("	"));
						break;
					}
					case "TARGETDURATION":
						if (level.targetduration !== 0) assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
						level.targetduration = Math.max(parseInt(value1), 1);
						break;
					case "VERSION":
						if (level.version !== null) assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
						level.version = parseInt(value1);
						break;
					case "INDEPENDENT-SEGMENTS": break;
					case "I-FRAMES-ONLY":
						level.iframesOnly = true;
						break;
					case "ENDLIST":
						if (!level.live) assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
						level.live = false;
						break;
					case "#":
						if (value1 || value2) frag.tagList.push(value2 ? [value1, value2] : [value1]);
						break;
					case "DISCONTINUITY":
						discontinuityCounter++;
						frag.tagList.push(["DIS"]);
						break;
					case "GAP":
						frag.gap = true;
						frag.tagList.push([tag]);
						break;
					case "BITRATE":
						frag.tagList.push([tag, value1]);
						currentBitrate = parseInt(value1) * 1e3;
						if (isFiniteNumber(currentBitrate)) frag.bitrate = currentBitrate;
						else currentBitrate = 0;
						break;
					case "DATERANGE": {
						const dateRangeAttr = new AttrList(value1, level);
						const dateRange = new DateRange(dateRangeAttr, level.dateRanges[dateRangeAttr.ID], level.dateRangeTagCount);
						level.dateRangeTagCount++;
						if (dateRange.isValid || level.skippedSegments) level.dateRanges[dateRange.id] = dateRange;
						else logger.log(`Ignoring invalid DATERANGE tag: ${dateRange.invalidReason}: ${value1}`);
						frag.tagList.push(["EXT-X-DATERANGE", value1]);
						break;
					}
					case "DEFINE": break;
					case "DISCONTINUITY-SEQUENCE":
						if (level.startCC !== 0) assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
						level.startCC = discontinuityCounter = parseInt(value1);
						fragments.forEach((frag) => frag && (frag.cc = discontinuityCounter));
						break;
					case "KEY": {
						const levelKey = parseKey(value1, baseurl, level);
						if (levelKey.isSupported()) {
							if (levelKey.method === "NONE") {
								levelkeys = void 0;
								break;
							}
							if (!levelkeys) levelkeys = {};
							const currentKey = levelkeys[levelKey.keyFormat];
							if (!(currentKey != null && currentKey.matches(levelKey))) {
								if (currentKey) levelkeys = _extends({}, levelkeys);
								levelkeys[levelKey.keyFormat] = levelKey;
							}
						} else logger.warn(`[Keys] Ignoring unsupported EXT-X-KEY tag: "${value1}" (light build)`);
						break;
					}
					case "START":
						level.startTimeOffset = parseStartTimeOffset(value1);
						break;
					case "MAP": {
						const mapAttrs = new AttrList(value1, level);
						if (frag.duration) {
							const init = new Fragment(type, base);
							setInitSegment(init, mapAttrs, id, levelkeys);
							currentInitSegment = init;
							frag.initSegment = currentInitSegment;
							if (currentInitSegment.rawProgramDateTime && !frag.rawProgramDateTime) frag.rawProgramDateTime = currentInitSegment.rawProgramDateTime;
						} else {
							const end = frag.byteRangeEndOffset;
							if (end) {
								const start = frag.byteRangeStartOffset;
								nextByteRange = `${end - start}@${start}`;
							} else nextByteRange = null;
							setInitSegment(frag, mapAttrs, id, levelkeys);
							currentInitSegment = frag;
							createNextFrag = true;
						}
						currentInitSegment.cc = discontinuityCounter;
						break;
					}
					case "SERVER-CONTROL":
						if (serverControlAttrs) assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
						serverControlAttrs = new AttrList(value1);
						level.canBlockReload = serverControlAttrs.bool("CAN-BLOCK-RELOAD");
						level.canSkipUntil = serverControlAttrs.optionalFloat("CAN-SKIP-UNTIL", 0);
						level.canSkipDateRanges = level.canSkipUntil > 0 && serverControlAttrs.bool("CAN-SKIP-DATERANGES");
						level.partHoldBack = serverControlAttrs.optionalFloat("PART-HOLD-BACK", 0);
						level.holdBack = serverControlAttrs.optionalFloat("HOLD-BACK", 0);
						break;
					case "PART-INF":
						if (level.partTarget) assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
						level.partTarget = new AttrList(value1).decimalFloatingPoint("PART-TARGET");
						break;
					case "PART": {
						let partList = level.partList;
						if (!partList) partList = level.partList = [];
						const previousPart = currentPart > 0 ? partList[partList.length - 1] : void 0;
						const index = currentPart++;
						const part = new Part(new AttrList(value1, level), frag, base, index, previousPart);
						partList.push(part);
						frag.duration += part.duration;
						break;
					}
					case "PRELOAD-HINT":
						level.preloadHint = new AttrList(value1, level);
						break;
					case "RENDITION-REPORT": {
						const renditionReportAttrs = new AttrList(value1, level);
						level.renditionReports = level.renditionReports || [];
						level.renditionReports.push(renditionReportAttrs);
						break;
					}
					default: logger.warn(`line parsed but not handled: ${result}`);
				}
			}
		}
		if (prevFrag && !prevFrag.relurl) {
			fragments.pop();
			totalduration -= prevFrag.duration;
			if (level.partList) level.fragmentHint = prevFrag;
		} else if (level.partList) {
			assignProgramDateTime(frag, prevFrag, programDateTimes);
			frag.cc = discontinuityCounter;
			level.fragmentHint = frag;
			if (levelkeys) setFragLevelKeys(frag, levelkeys, level);
		}
		if (!level.targetduration) level.playlistParsingError = /* @__PURE__ */ new Error(`Missing Target Duration`);
		const fragmentLength = fragments.length;
		const firstFragment = fragments[0];
		const lastFragment = fragments[fragmentLength - 1];
		totalduration += level.skippedSegments * level.targetduration;
		if (totalduration > 0 && fragmentLength && lastFragment) {
			level.averagetargetduration = totalduration / fragmentLength;
			const lastSn = lastFragment.sn;
			level.endSN = lastSn !== "initSegment" ? lastSn : 0;
			if (!level.live) lastFragment.endList = true;
			/**
			* Backfill any missing PDT values
			* "If the first EXT-X-PROGRAM-DATE-TIME tag in a Playlist appears after
			* one or more Media Segment URIs, the client SHOULD extrapolate
			* backward from that tag (using EXTINF durations and/or media
			* timestamps) to associate dates with those segments."
			* We have already extrapolated forward, but all fragments up to the first instance of PDT do not have their PDTs
			* computed.
			*/
			if (firstPdtIndex > 0) {
				backfillProgramDateTimes(fragments, firstPdtIndex, firstPdtIndex > fragmentLength - 1 ? frag : null);
				if (firstFragment) programDateTimes.unshift(firstFragment);
			}
		}
		if (level.fragmentHint) totalduration += level.fragmentHint.duration;
		level.totalduration = totalduration;
		if (programDateTimes.length && level.dateRangeTagCount && firstFragment) mapDateRanges(programDateTimes, level);
		level.endCC = discontinuityCounter;
		return level;
	}
};
function createVariant(attrs, tUri, baseurl, parsed, levelsWithKnownCodecs, iframes) {
	var _level$unknownCodecs;
	if (tUri === void 0) return null;
	const uri = tUri;
	const level = {
		attrs,
		bitrate: attrs.decimalInteger("BANDWIDTH") || attrs.decimalInteger("AVERAGE-BANDWIDTH"),
		name: attrs.NAME,
		url: M3U8Parser.resolve(uri, baseurl)
	};
	const resolution = attrs.decimalResolution("RESOLUTION");
	if (resolution) {
		level.width = resolution.width;
		level.height = resolution.height;
	}
	setCodecs(attrs.CODECS, level);
	const supplementalCodecs = attrs["SUPPLEMENTAL-CODECS"];
	if (supplementalCodecs) {
		level.supplemental = {};
		setCodecs(supplementalCodecs, level.supplemental);
	}
	if (!((_level$unknownCodecs = level.unknownCodecs) != null && _level$unknownCodecs.length)) levelsWithKnownCodecs.push(level);
	if (iframes) level.iframes = true;
	return level;
}
function mapDateRanges(programDateTimes, details) {
	let programDateTimeCount = programDateTimes.length;
	if (!programDateTimeCount) {
		if (details.hasProgramDateTime) {
			const lastFragment = details.fragments[details.fragments.length - 1];
			programDateTimes.push(lastFragment);
			programDateTimeCount++;
		} else return;
	}
	const lastProgramDateTime = programDateTimes[programDateTimeCount - 1];
	const playlistEnd = details.live ? Infinity : details.totalduration;
	const dateRangeIds = Object.keys(details.dateRanges);
	for (let i = dateRangeIds.length; i--;) {
		const dateRange = details.dateRanges[dateRangeIds[i]];
		const startDateTime = dateRange.startDate.getTime();
		dateRange.tagAnchor = lastProgramDateTime.ref;
		for (let j = programDateTimeCount; j--;) {
			var _programDateTimes$j;
			if (((_programDateTimes$j = programDateTimes[j]) == null ? void 0 : _programDateTimes$j.sn) < details.startSN) break;
			const fragment = findFragmentWithStartDate(details, startDateTime, programDateTimes, j, playlistEnd);
			if (fragment) {
				dateRange.tagAnchor = fragment.ref;
				break;
			}
		}
	}
}
function findFragmentWithStartDate(details, startDateTime, programDateTimes, index, endTime) {
	const pdtFragment = programDateTimes[index];
	if (pdtFragment) {
		const pdtStart = pdtFragment.programDateTime;
		if (startDateTime >= pdtStart || index === 0) {
			var _programDateTimes;
			if (startDateTime <= pdtStart + ((((_programDateTimes = programDateTimes[index + 1]) == null ? void 0 : _programDateTimes.start) || endTime) - pdtFragment.start) * 1e3) {
				const startIndex = pdtFragment.sn - details.startSN;
				const fragments = details.fragments;
				if (startIndex >= 0 && startIndex < fragments.length) {
					if (fragments.length > programDateTimes.length) {
						const endSegment = programDateTimes[index + 1] || fragments[fragments.length - 1];
						const endIndex = Math.min(endSegment.sn - details.startSN, fragments.length - 1);
						for (let i = endIndex; i > startIndex; i--) {
							const fragStartDateTime = fragments[i].programDateTime;
							if (startDateTime >= fragStartDateTime && startDateTime < fragStartDateTime + fragments[i].duration * 1e3) return fragments[i];
						}
					}
					return fragments[startIndex];
				}
			}
		}
	}
	return null;
}
function parseKey(keyTagAttributes, baseurl, parsed) {
	var _keyAttrs$METHOD, _keyAttrs$KEYFORMAT;
	const keyAttrs = new AttrList(keyTagAttributes, parsed);
	const decryptmethod = (_keyAttrs$METHOD = keyAttrs.METHOD) != null ? _keyAttrs$METHOD : "";
	const decrypturi = keyAttrs.URI;
	const decryptiv = keyAttrs.hexadecimalInteger("IV");
	const decryptkeyformatversions = keyAttrs.KEYFORMATVERSIONS;
	const decryptkeyformat = (_keyAttrs$KEYFORMAT = keyAttrs.KEYFORMAT) != null ? _keyAttrs$KEYFORMAT : "identity";
	if (decrypturi && keyAttrs.IV && !decryptiv) logger.error(`Invalid IV: ${keyAttrs.IV}`);
	return new LevelKey(decryptmethod, decrypturi ? M3U8Parser.resolve(decrypturi, baseurl) : "", decryptkeyformat, (decryptkeyformatversions ? decryptkeyformatversions : "1").split("/").map(Number).filter(Number.isFinite), decryptiv, keyAttrs.KEYID);
}
function parseStartTimeOffset(startAttributes) {
	const startTimeOffset = new AttrList(startAttributes).decimalFloatingPoint("TIME-OFFSET");
	if (isFiniteNumber(startTimeOffset)) return startTimeOffset;
	return null;
}
function setCodecs(codecsAttributeValue, level) {
	let codecs = (codecsAttributeValue || "").split(/[ ,]+/).filter((c) => c);
	[
		"video",
		"audio",
		"text",
		"image"
	].forEach((type) => {
		const filtered = codecs.filter((codec) => isCodecType(codec, type));
		if (filtered.length) {
			level[`${type}Codec`] = filtered.map((c) => c.split("/")[0]).join(",");
			codecs = codecs.filter((codec) => filtered.indexOf(codec) === -1);
		}
	});
	level.unknownCodecs = codecs;
}
function assignCodec(media, groupItem, codecProperty) {
	const codecValue = groupItem[codecProperty];
	if (codecValue) media[codecProperty] = codecValue;
}
function backfillProgramDateTimes(fragments, firstPdtIndex, fragPrev) {
	fragPrev || (fragPrev = fragments[firstPdtIndex]);
	if (!fragPrev) return;
	for (let i = firstPdtIndex; i--;) {
		const frag = fragments[i];
		if (!frag) return;
		frag.programDateTime = fragPrev.programDateTime - frag.duration * 1e3;
		fragPrev = frag;
	}
}
function assignProgramDateTime(frag, prevFrag, programDateTimes) {
	if (frag.rawProgramDateTime) programDateTimes.push(frag);
	else if (prevFrag != null && prevFrag.programDateTime) frag.programDateTime = prevFrag.endProgramDateTime;
}
function setInitSegment(frag, mapAttrs, id, levelkeys) {
	frag.relurl = mapAttrs.URI;
	if (mapAttrs.BYTERANGE) frag.setByteRange(mapAttrs.BYTERANGE);
	frag.level = id;
	frag.sn = "initSegment";
	if (levelkeys) frag.levelkeys = levelkeys;
	frag.initSegment = null;
}
function setFragLevelKeys(frag, levelkeys, level) {
	frag.levelkeys = levelkeys;
	const { encryptedFragments } = level;
	if ((!encryptedFragments.length || encryptedFragments[encryptedFragments.length - 1].levelkeys !== levelkeys) && Object.keys(levelkeys).some((format) => levelkeys[format].isCommonEncryption)) encryptedFragments.push(frag);
}
function assignMultipleMediaPlaylistTagOccuranceError(level, tag, result) {
	level.playlistParsingError = /* @__PURE__ */ new Error(`#EXT-X-${tag} must not appear more than once (${result[0]})`);
}
function assignMustAppearBeforeSegmentsError(level, tag, result) {
	level.playlistParsingError = /* @__PURE__ */ new Error(`#EXT-X-${tag} must appear before the first Media Segment (${result[0]})`);
}
function updateFromToPTS(fragFrom, fragTo) {
	const fragToPTS = fragTo.startPTS;
	if (isFiniteNumber(fragToPTS)) {
		let duration = 0;
		let frag;
		if (fragTo.sn > fragFrom.sn) {
			duration = fragToPTS - fragFrom.start;
			frag = fragFrom;
		} else {
			duration = fragFrom.start - fragToPTS;
			frag = fragTo;
		}
		if (frag.duration !== duration) frag.setDuration(duration);
	} else if (fragTo.sn > fragFrom.sn) {
		if (fragFrom.cc === fragTo.cc && fragFrom.minEndPTS) fragTo.setStart(fragFrom.start + (fragFrom.minEndPTS - fragFrom.start));
		else fragTo.setStart(fragFrom.start + fragFrom.duration);
	} else fragTo.setStart(Math.max(fragFrom.start - fragTo.duration, 0));
}
function updateFragPTSDTS(details, frag, startPTS, endPTS, startDTS, endDTS, iframesOnly, logger) {
	if (endPTS - startPTS <= 0) {
		logger.warn("Fragment should have a positive duration", frag);
		endPTS = startPTS + frag.duration;
		endDTS = startDTS + frag.duration;
	}
	let maxStartPTS = startPTS;
	let minEndPTS = endPTS;
	const fragStartPts = frag.startPTS;
	const fragEndPts = frag.endPTS;
	if (isFiniteNumber(fragStartPts)) {
		const deltaPTS = Math.abs(fragStartPts - startPTS);
		if (details && deltaPTS > details.totalduration) logger.warn(`media timestamps and playlist times differ by ${deltaPTS}s for level ${frag.level} ${details.url}`);
		else if (!isFiniteNumber(frag.deltaPTS)) frag.deltaPTS = deltaPTS;
		else frag.deltaPTS = Math.max(deltaPTS, frag.deltaPTS);
		maxStartPTS = Math.max(startPTS, fragStartPts);
		startPTS = Math.min(startPTS, fragStartPts);
		startDTS = frag.startDTS !== void 0 ? Math.min(startDTS, frag.startDTS) : startDTS;
		minEndPTS = Math.min(endPTS, fragEndPts);
		endPTS = Math.max(endPTS, fragEndPts);
		endDTS = frag.endDTS !== void 0 ? Math.max(endDTS, frag.endDTS) : endDTS;
	}
	const drift = startPTS - frag.start;
	if (frag.start !== 0) frag.setStart(startPTS);
	frag.setDuration(endPTS - frag.start);
	frag.startPTS = startPTS;
	frag.maxStartPTS = maxStartPTS;
	frag.startDTS = startDTS;
	frag.endPTS = endPTS;
	frag.minEndPTS = minEndPTS;
	frag.endDTS = endDTS;
	return alignSliding(details, frag, drift);
}
function alignSliding(details, frag, drift) {
	var _details$fragmentHint;
	const sn = frag.sn;
	if (!details || sn < details.startSN || sn > (((_details$fragmentHint = details.fragmentHint) == null ? void 0 : _details$fragmentHint.sn) || details.endSN)) return 0;
	let i;
	const fragIdx = sn - details.startSN;
	const fragments = details.fragments;
	fragments[fragIdx] = frag;
	for (i = fragIdx; i > 0; i--) updateFromToPTS(fragments[i], fragments[i - 1]);
	for (i = fragIdx; i < fragments.length - 1; i++) updateFromToPTS(fragments[i], fragments[i + 1]);
	if (details.fragmentHint) updateFromToPTS(fragments[fragments.length - 1], details.fragmentHint);
	details.PTSKnown = details.alignedSliding = true;
	return drift;
}
function mergeDetails(oldDetails, newDetails, logger) {
	if (oldDetails === newDetails) return;
	let currentInitSegment = null;
	const oldFragments = oldDetails.fragments;
	for (let i = oldFragments.length - 1; i >= 0; i--) {
		const oldInit = oldFragments[i].initSegment;
		if (oldInit) {
			currentInitSegment = oldInit;
			break;
		}
	}
	if (oldDetails.fragmentHint) delete oldDetails.fragmentHint.endPTS;
	let PTSFrag;
	mapFragmentIntersection(oldDetails, newDetails, (oldFrag, newFrag, newFragIndex, newFragments) => {
		if (newFrag.cc !== oldFrag.cc && (oldFrag.cc > newFrag.cc || newDetails.skippedSegments)) {
			const ccOffset = oldFrag.cc - newFrag.cc;
			for (let i = newFragIndex; i < newFragments.length; i++) newFragments[i].cc += ccOffset;
			newDetails.endCC = newFragments[newFragments.length - 1].cc;
		}
		if (isFiniteNumber(oldFrag.startPTS) && isFiniteNumber(oldFrag.endPTS)) {
			newFrag.setStart(newFrag.startPTS = oldFrag.startPTS);
			newFrag.startDTS = oldFrag.startDTS;
			newFrag.maxStartPTS = oldFrag.maxStartPTS;
			newFrag.endPTS = oldFrag.endPTS;
			newFrag.endDTS = oldFrag.endDTS;
			newFrag.minEndPTS = oldFrag.minEndPTS;
			newFrag.setDuration(oldFrag.endPTS - oldFrag.startPTS);
			if (newFrag.duration) PTSFrag = newFrag;
			newDetails.PTSKnown = newDetails.alignedSliding = true;
		}
		if (oldFrag.hasStreams) newFrag.elementaryStreams = oldFrag.elementaryStreams;
		newFrag.loader = oldFrag.loader;
		newFrag.gap = oldFrag.gap || newFrag.gap;
		if (oldFrag.hasStats) newFrag.stats = oldFrag.stats;
		if (oldFrag.initSegment) {
			newFrag.initSegment = oldFrag.initSegment;
			currentInitSegment = oldFrag.initSegment;
		}
	});
	const newFragments = newDetails.fragments;
	const fragmentsToCheck = newDetails.fragmentHint ? newFragments.concat(newDetails.fragmentHint) : newFragments;
	if (currentInitSegment) fragmentsToCheck.forEach((frag) => {
		var _currentInitSegment;
		if (frag && (!frag.initSegment || frag.initSegment.relurl === ((_currentInitSegment = currentInitSegment) == null ? void 0 : _currentInitSegment.relurl))) frag.initSegment = currentInitSegment;
	});
	if (newDetails.skippedSegments) {
		newDetails.deltaUpdateFailed = newFragments.some((frag) => !frag);
		if (newDetails.deltaUpdateFailed) {
			logger.warn("[level-helper] Previous playlist missing segments skipped in delta playlist");
			for (let i = newDetails.skippedSegments; i--;) newFragments.shift();
			newDetails.startSN = newFragments[0].sn;
		} else {
			if (newDetails.canSkipDateRanges) newDetails.dateRanges = mergeDateRanges(oldDetails.dateRanges, newDetails, logger);
			const programDateTimes = oldDetails.fragments.filter((frag) => frag.rawProgramDateTime);
			if (oldDetails.hasProgramDateTime && !newDetails.hasProgramDateTime) {
				for (let i = 1; i < fragmentsToCheck.length; i++) if (fragmentsToCheck[i].programDateTime === null) assignProgramDateTime(fragmentsToCheck[i], fragmentsToCheck[i - 1], programDateTimes);
			}
			mapDateRanges(programDateTimes, newDetails);
		}
		newDetails.endCC = newFragments[newFragments.length - 1].cc;
	} else if (newDetails.startSN > oldDetails.endSN && newFragments[0].cc < oldDetails.endCC) {
		const ccOffset = oldDetails.endCC - newFragments[0].cc;
		fragmentsToCheck.forEach((frag) => {
			frag.cc += ccOffset;
		});
		newDetails.endCC += ccOffset;
	}
	if (!newDetails.startCC) {
		var _fragPriorToNewStart$;
		const fragPriorToNewStart = getFragmentWithSN(oldDetails, newDetails.startSN - 1);
		newDetails.startCC = (_fragPriorToNewStart$ = fragPriorToNewStart == null ? void 0 : fragPriorToNewStart.cc) != null ? _fragPriorToNewStart$ : newFragments[0].cc;
	}
	mapPartIntersection(oldDetails.partList, newDetails.partList, (oldPart, newPart) => {
		newPart.elementaryStreams = oldPart.elementaryStreams;
		newPart.stats = oldPart.stats;
		newPart.gap = oldPart.gap || newPart.gap;
	});
	if (PTSFrag) {
		const iframesOnly = newDetails.iframesOnly && PTSFrag.type === PlaylistLevelType.MAIN;
		updateFragPTSDTS(newDetails, PTSFrag, PTSFrag.startPTS, PTSFrag.endPTS, PTSFrag.startDTS, PTSFrag.endDTS, iframesOnly, logger);
	} else adjustSliding(oldDetails, newDetails);
	if (newFragments.length) newDetails.totalduration = newDetails.edge - newFragments[0].start;
	newDetails.driftStartTime = oldDetails.driftStartTime;
	newDetails.driftStart = oldDetails.driftStart;
	const advancedDateTime = newDetails.advancedDateTime;
	if (newDetails.advanced && advancedDateTime) {
		const edge = newDetails.edge;
		if (!newDetails.driftStart) {
			newDetails.driftStartTime = advancedDateTime;
			newDetails.driftStart = edge;
		}
		newDetails.driftEndTime = advancedDateTime;
		newDetails.driftEnd = edge;
	} else {
		newDetails.driftEndTime = oldDetails.driftEndTime;
		newDetails.driftEnd = oldDetails.driftEnd;
		newDetails.advancedDateTime = oldDetails.advancedDateTime;
	}
	if (newDetails.requestScheduled === -1) newDetails.requestScheduled = oldDetails.requestScheduled;
}
function mergeDateRanges(oldDateRanges, newDetails, logger) {
	const { dateRanges: deltaDateRanges, recentlyRemovedDateranges } = newDetails;
	const dateRanges = _extends({}, oldDateRanges);
	if (recentlyRemovedDateranges) recentlyRemovedDateranges.forEach((id) => {
		delete dateRanges[id];
	});
	const mergeCount = Object.keys(dateRanges).length;
	if (!mergeCount) return deltaDateRanges;
	Object.keys(deltaDateRanges).forEach((id) => {
		const mergedDateRange = dateRanges[id];
		const dateRange = new DateRange(deltaDateRanges[id].attr, mergedDateRange);
		if (dateRange.isValid) {
			dateRanges[id] = dateRange;
			if (!mergedDateRange) dateRange.tagOrder += mergeCount;
		} else logger.warn(`Ignoring invalid Playlist Delta Update DATERANGE tag: "${stringify(deltaDateRanges[id].attr)}"`);
	});
	return dateRanges;
}
function mapPartIntersection(oldParts, newParts, intersectionFn) {
	if (oldParts && newParts) {
		let delta = 0;
		for (let i = 0, len = oldParts.length; i < len; i++) {
			const oldPart = oldParts[i];
			const newPart = newParts[i + delta];
			if (oldPart && newPart && oldPart.index === newPart.index && oldPart.fragment.sn === newPart.fragment.sn) intersectionFn(oldPart, newPart);
			else delta--;
		}
	}
}
function mapFragmentIntersection(oldDetails, newDetails, intersectionFn) {
	var _oldDetails$fragmentH;
	const skippedSegments = newDetails.skippedSegments;
	const start = Math.max(oldDetails.startSN, newDetails.startSN) - newDetails.startSN;
	const end = (oldDetails.fragmentHint ? 1 : 0) + (skippedSegments ? newDetails.endSN : Math.min(oldDetails.endSN, newDetails.endSN)) - newDetails.startSN;
	const delta = newDetails.startSN - oldDetails.startSN;
	const newFrags = newDetails.fragmentHint ? newDetails.fragments.concat(newDetails.fragmentHint) : newDetails.fragments;
	const oldFrags = (_oldDetails$fragmentH = oldDetails.fragmentHint) != null && _oldDetails$fragmentH.duration ? oldDetails.fragments.concat(oldDetails.fragmentHint) : oldDetails.fragments;
	for (let i = start; i <= end; i++) {
		const oldFrag = oldFrags[delta + i];
		let newFrag = newFrags[i];
		if (skippedSegments && !newFrag && oldFrag) newFrag = newDetails.fragments[i] = oldFrag;
		if (oldFrag && newFrag) {
			intersectionFn(oldFrag, newFrag, i, newFrags);
			const uriBefore = oldFrag.relurl;
			const uriAfter = newFrag.relurl;
			if (uriBefore && notEqualAfterStrippingQueries(uriBefore, uriAfter)) {
				newDetails.playlistParsingError = getSequenceError(`media sequence mismatch ${newFrag.sn}:`, oldDetails, newDetails, oldFrag, newFrag);
				return;
			} else if (oldFrag.cc !== newFrag.cc) {
				newDetails.playlistParsingError = getSequenceError(`discontinuity sequence mismatch (${oldFrag.cc}!=${newFrag.cc})`, oldDetails, newDetails, oldFrag, newFrag);
				return;
			}
		}
	}
}
function getSequenceError(message, oldDetails, newDetails, oldFrag, newFrag) {
	return /* @__PURE__ */ new Error(`${message} ${newFrag.url}
Playlist starting @${oldDetails.startSN}
${oldDetails.m3u8}

Playlist starting @${newDetails.startSN}
${newDetails.m3u8}`);
}
function adjustSliding(oldDetails, newDetails, matchingStableVariantOrRendition = true, logger) {
	const delta = newDetails.startSN + newDetails.skippedSegments - oldDetails.startSN;
	const oldFragments = oldDetails.fragments;
	const advancedOrStable = delta >= 0;
	let sliding = 0;
	if (advancedOrStable && delta < oldFragments.length) {
		sliding = oldFragments[delta].start;
		logger?.log(`Aligning playlists based on SN ${newDetails.startSN} (diff: ${sliding})`);
	} else if (advancedOrStable && newDetails.startSN === oldDetails.endSN + 1) {
		sliding = oldDetails.fragmentEnd;
		logger?.log(`Aligning playlists based on first/last SN ${newDetails.startSN} (diff: ${sliding})`);
	} else if (advancedOrStable && matchingStableVariantOrRendition) sliding = oldDetails.fragmentStart + delta * newDetails.levelTargetDuration;
	else if (!newDetails.skippedSegments && newDetails.fragmentStart === 0) {
		sliding = oldDetails.fragmentStart;
		logger?.log(`Aligning playlists based on first SN ${newDetails.startSN} (diff: ${sliding})`);
	} else return sliding;
	addSliding(newDetails, sliding);
	return sliding;
}
function addSliding(details, sliding) {
	if (sliding) {
		const fragments = details.fragments;
		for (let i = details.skippedSegments; i < fragments.length; i++) fragments[i].addStart(sliding);
		if (details.fragmentHint) details.fragmentHint.addStart(sliding);
	}
}
function computeReloadInterval(newDetails, distanceToLiveEdgeMs = Infinity) {
	let reloadInterval = 1e3 * newDetails.targetduration;
	if (newDetails.updated) {
		const fragments = newDetails.fragments;
		if (fragments.length && reloadInterval * 4 > distanceToLiveEdgeMs) {
			const lastSegmentDuration = fragments[fragments.length - 1].duration * 1e3;
			if (lastSegmentDuration > 0 && lastSegmentDuration < reloadInterval) reloadInterval = lastSegmentDuration;
		}
	} else reloadInterval /= 2;
	return Math.round(reloadInterval);
}
function getFragmentWithSN(details, sn, fragCurrent) {
	var _fragment;
	if (!details) return null;
	let fragment = details.fragments[sn - details.startSN];
	if (fragment) return fragment;
	fragment = details.fragmentHint;
	if (((_fragment = fragment) == null ? void 0 : _fragment.sn) === sn) return fragment;
	if (fragCurrent && sn < details.startSN && fragCurrent.sn === sn) return fragCurrent;
	return null;
}
function getPartWith(details, sn, partIndex) {
	if (!details) return null;
	return findPart(details.partList, sn, partIndex);
}
function findPart(partList, sn, partIndex) {
	if (partList) for (let i = partList.length; i--;) {
		const part = partList[i];
		if (part.index === partIndex && part.fragment.sn === sn) return part;
	}
	return null;
}
function reassignFragmentLevelIndexes(levels) {
	levels.forEach((level, index) => {
		var _level$details;
		(_level$details = level.details) == null || _level$details.fragments.forEach((fragment) => {
			fragment.level = index;
			if (fragment.initSegment) fragment.initSegment.level = index;
		});
	});
}
function notEqualAfterStrippingQueries(uriBefore, uriAfter) {
	if (uriBefore !== uriAfter && uriAfter) return stripQuery(uriBefore) !== stripQuery(uriAfter);
	return false;
}
function stripQuery(uri) {
	return uri.replace(/\?[^?]*$/, "");
}
var BasePlaylistController = class extends Logger {
	constructor(hls, logPrefix) {
		super(logPrefix, hls.logger);
		this.hls = void 0;
		this.canLoad = false;
		this.timer = -1;
		this.loadingSync = false;
		this.hls = hls;
	}
	destroy() {
		this.clearTimer();
		this.hls = null;
	}
	clearTimer() {
		if (this.timer !== -1) {
			self.clearTimeout(this.timer);
			this.timer = -1;
		}
	}
	startLoad() {
		this.canLoad = true;
		this.loadPlaylist();
	}
	stopLoad() {
		this.canLoad = false;
		this.clearTimer();
	}
	switchParams(playlistUri, previous, current) {
		const renditionReports = previous == null ? void 0 : previous.renditionReports;
		if (renditionReports) {
			let foundIndex = -1;
			for (let i = 0; i < renditionReports.length; i++) {
				const attr = renditionReports[i];
				let uri;
				try {
					uri = new self.URL(attr.URI, previous.url).href;
				} catch (error) {
					this.warn(`Could not construct new URL for Rendition Report: ${error}`);
					uri = attr.URI || "";
				}
				if (uri === playlistUri) {
					foundIndex = i;
					break;
				} else if (uri === playlistUri.substring(0, uri.length)) foundIndex = i;
			}
			if (foundIndex !== -1) {
				const attr = renditionReports[foundIndex];
				const msn = parseInt(attr["LAST-MSN"]) || previous.lastPartSn;
				let part = parseInt(attr["LAST-PART"]) || previous.lastPartIndex;
				if (this.hls.config.lowLatencyMode) {
					const currentGoal = Math.min(previous.age - previous.partTarget, previous.targetduration);
					if (part >= 0 && currentGoal > previous.partTarget) part += 1;
				}
				const skip = current && getSkipValue(current);
				return new HlsUrlParameters(msn, part >= 0 ? part : void 0, skip);
			}
		}
	}
	loadPlaylist(hlsUrlParameters) {
		this.clearTimer();
	}
	loadingPlaylist(playlist, hlsUrlParameters) {
		this.clearTimer();
	}
	shouldLoadPlaylist(playlist) {
		return this.canLoad && !!playlist && !!playlist.url && (!playlist.details || playlist.details.live);
	}
	getUrlWithDirectives(uri, hlsUrlParameters) {
		if (hlsUrlParameters) try {
			return hlsUrlParameters.addDirectives(uri);
		} catch (error) {
			this.warn(`Could not construct new URL with HLS Delivery Directives: ${error}`);
		}
		return uri;
	}
	playlistLoaded(index, data, previousDetails) {
		const { details, stats } = data;
		const fragments = details.fragments;
		const now = self.performance.now();
		const elapsed = stats.loading.first ? Math.max(0, Math.floor(now - stats.loading.first)) : 0;
		details.advancedDateTime = Date.now() - elapsed;
		const timelineOffset = this.hls.config.timelineOffset;
		if (timelineOffset !== details.appliedTimelineOffset) {
			const offset = Math.max(timelineOffset || 0, 0);
			details.appliedTimelineOffset = offset;
			fragments.forEach((frag) => {
				frag?.setStart(frag.playlistOffset + offset);
			});
		}
		if (details.live || previousDetails != null && previousDetails.live) {
			var _fragments;
			const levelOrTrack = "levelInfo" in data ? data.levelInfo : data.track;
			details.reloaded(previousDetails);
			const parent = (_fragments = fragments[fragments.length - 1]) == null ? void 0 : _fragments.type;
			if (details.misses >= this.hls.config.liveMaxUnchangedPlaylistRefresh) {
				const error = /* @__PURE__ */ new Error(`${parent} playlist ${levelOrTrack.id} hit max allowed unchanged reloads.`);
				this.warn(error);
				const { networkDetails, context } = data;
				this.hls.trigger(Events.ERROR, {
					type: ErrorTypes.NETWORK_ERROR,
					details: ErrorDetails.PLAYLIST_UNCHANGED_ERROR,
					fatal: false,
					url: details.url,
					error,
					reason: error.message,
					level: data.level,
					parent,
					context,
					networkDetails,
					stats
				});
				return;
			}
			if (previousDetails) {
				mergeDetails(previousDetails, details, this);
				const error = details.playlistParsingError;
				if (error) {
					this.warn(error);
					const hls = this.hls;
					if (!hls.config.ignorePlaylistParsingErrors) {
						const { networkDetails } = data;
						hls.trigger(Events.ERROR, {
							type: ErrorTypes.NETWORK_ERROR,
							details: ErrorDetails.LEVEL_PARSING_ERROR,
							fatal: false,
							url: details.url,
							error,
							reason: error.message,
							level: data.level,
							parent,
							networkDetails,
							stats
						});
						return;
					}
					details.playlistParsingError = null;
				}
			}
			if (details.requestScheduled === -1) details.requestScheduled = stats.loading.start;
			const bufferInfo = this.hls.mainForwardBufferInfo;
			const position = bufferInfo ? bufferInfo.end - bufferInfo.len : 0;
			const reloadInterval = computeReloadInterval(details, (details.edge - position) * 1e3);
			if (details.requestScheduled + reloadInterval < now) details.requestScheduled = now;
			else if (details.requestScheduled <= now) details.requestScheduled += reloadInterval;
			const requestedHls = data.deliveryDirectives;
			this.log(`live playlist ${index} ${details.advanced ? `REFRESHED ${details.lastPartSn} - ${details.lastPartIndex}` : details.updated ? "UPDATED" : `MISSED (received ${details.lastPartSn} - ${details.lastPartIndex}${requestedHls ? ` | requested ${requestedHls.msn} - ${requestedHls.part}` : ""})`}`);
			if (!this.canLoad || !details.live) return;
			let deliveryDirectives;
			let msn = void 0;
			let part = void 0;
			if (details.canBlockReload && details.advanced) {
				const lowLatencyMode = this.hls.config.lowLatencyMode;
				const lastPartSn = details.lastPartSn;
				const endSn = details.endSN;
				const lastPartIndex = details.lastPartIndex;
				const hasParts = lastPartIndex !== -1;
				const atLastPartOfSegment = lastPartSn === endSn;
				if (hasParts) {
					if (atLastPartOfSegment) {
						msn = endSn + 1;
						part = lowLatencyMode ? 0 : lastPartIndex;
					} else {
						msn = lastPartSn;
						part = lowLatencyMode ? lastPartIndex + 1 : details.maxPartIndex;
					}
				} else msn = endSn + 1;
				const lastAdvanced = details.age;
				const cdnAge = lastAdvanced + details.ageHeader;
				let currentGoal = Math.min(cdnAge - details.partTarget, details.targetduration * 1.5);
				if (currentGoal > 0) {
					if (cdnAge > details.targetduration * 3) {
						this.log(`Playlist last advanced ${lastAdvanced.toFixed(2)}s ago. Omitting segment and part directives.`);
						msn = void 0;
						part = void 0;
					} else if (previousDetails != null && previousDetails.tuneInGoal && cdnAge - details.partTarget > previousDetails.tuneInGoal) {
						this.warn(`CDN Tune-in goal increased from: ${previousDetails.tuneInGoal} to: ${currentGoal} with playlist age: ${details.age}`);
						currentGoal = 0;
					} else {
						const segments = Math.floor(currentGoal / details.targetduration);
						msn += segments;
						if (part !== void 0) {
							const parts = Math.round(currentGoal % details.targetduration / details.partTarget);
							part += parts;
						}
						this.log(`CDN Tune-in age: ${details.ageHeader}s last advanced ${lastAdvanced.toFixed(2)}s goal: ${currentGoal} skip sn ${segments} to part ${part}`);
					}
					details.tuneInGoal = currentGoal;
				}
				deliveryDirectives = this.getDeliveryDirectives(details, data.deliveryDirectives, msn, part);
				if (lowLatencyMode || !atLastPartOfSegment) {
					details.requestScheduled = now;
					this.loadingPlaylist(levelOrTrack, deliveryDirectives);
					return;
				}
			} else if (details.canBlockReload || details.canSkipUntil) deliveryDirectives = this.getDeliveryDirectives(details, data.deliveryDirectives, msn, part);
			if (deliveryDirectives && msn !== void 0 && details.canBlockReload) details.requestScheduled = stats.loading.first + Math.max(reloadInterval - elapsed * 2, reloadInterval / 2);
			this.scheduleLoading(levelOrTrack, deliveryDirectives, details);
		} else this.clearTimer();
	}
	scheduleLoading(levelOrTrack, deliveryDirectives, updatedDetails) {
		const details = updatedDetails || levelOrTrack.details;
		if (!details) {
			this.loadingPlaylist(levelOrTrack, deliveryDirectives);
			return;
		}
		const now = self.performance.now();
		const requestScheduled = details.requestScheduled;
		if (now >= requestScheduled && !this.loadingSync) {
			this.loadingSync = true;
			this.loadingPlaylist(levelOrTrack, deliveryDirectives);
			this.loadingSync = false;
			return;
		}
		const estimatedTimeUntilUpdate = Math.max(requestScheduled - now, 0);
		this.log(`reload live playlist ${levelOrTrack.name || levelOrTrack.bitrate + "bps"} in ${Math.round(estimatedTimeUntilUpdate)} ms`);
		this.clearTimer();
		this.timer = self.setTimeout(() => this.loadingPlaylist(levelOrTrack, deliveryDirectives), estimatedTimeUntilUpdate);
	}
	getDeliveryDirectives(details, previousDeliveryDirectives, msn, part) {
		let skip = getSkipValue(details);
		if (previousDeliveryDirectives != null && previousDeliveryDirectives.skip && details.deltaUpdateFailed) {
			msn = previousDeliveryDirectives.msn;
			part = previousDeliveryDirectives.part;
			skip = HlsSkip.No;
		}
		return new HlsUrlParameters(msn, part, skip);
	}
	checkRetry(errorEvent) {
		const errorDetails = errorEvent.details;
		const isTimeout = isTimeoutError(errorEvent);
		const errorAction = errorEvent.errorAction;
		const { action, retryCount = 0, retryConfig } = errorAction || {};
		const retry = !!errorAction && !!retryConfig && (action === NetworkErrorAction.RetryRequest || !errorAction.resolved && action === NetworkErrorAction.SendAlternateToPenaltyBox);
		if (retry) {
			var _errorEvent$context;
			if (retryCount >= retryConfig.maxNumRetry) return false;
			if (isTimeout && (_errorEvent$context = errorEvent.context) != null && _errorEvent$context.deliveryDirectives) {
				this.warn(`Retrying playlist loading ${retryCount + 1}/${retryConfig.maxNumRetry} after "${errorDetails}" without delivery-directives`);
				this.loadPlaylist();
			} else {
				var _errorEvent$response;
				const offlineStatus = offlineHttpStatus((_errorEvent$response = errorEvent.response) == null ? void 0 : _errorEvent$response.code);
				this.clearTimer();
				if (offlineStatus) {
					this.log(`Waiting for connection (offline)`);
					errorEvent.reason = "offline";
					this.timer = self.setTimeout(() => this.checkOfflineStatus(), 1e3);
				} else {
					const delay = getRetryDelay(retryConfig, retryCount);
					this.warn(`Retrying playlist loading ${retryCount + 1}/${retryConfig.maxNumRetry} after "${errorDetails}" in ${delay}ms`);
					this.timer = self.setTimeout(() => this.loadPlaylist(), delay);
				}
			}
			errorEvent.levelRetry = true;
			errorAction.resolved = true;
		}
		return retry;
	}
	checkOfflineStatus() {
		this.clearTimer();
		if (offlineHttpStatus(0)) this.timer = self.setTimeout(() => this.checkOfflineStatus(), 1e3);
		else {
			this.log(`Connection restored (online)`);
			this.loadPlaylist();
		}
	}
};
var BufferOperationQueue = class {
	constructor(sourceBufferReference) {
		this.tracks = void 0;
		this.queues = {
			video: [],
			audio: [],
			audiovideo: []
		};
		this.tracks = sourceBufferReference;
	}
	destroy() {
		this.tracks = this.queues = null;
	}
	append(operation, type, pending) {
		if (this.queues === null || this.tracks === null) return;
		const queue = this.queues[type];
		queue.push(operation);
		if (queue.length === 1 && !pending) this.executeNext(type);
	}
	appendBlocker(type) {
		return new Promise((resolve) => {
			const operation = {
				label: "async-blocker",
				execute: resolve,
				onStart: () => {},
				onComplete: () => {},
				onError: () => {}
			};
			this.append(operation, type);
		});
	}
	prependBlocker(type) {
		return new Promise((resolve) => {
			if (this.queues) {
				const operation = {
					label: "async-blocker-prepend",
					execute: resolve,
					onStart: () => {},
					onComplete: () => {},
					onError: () => {}
				};
				this.queues[type].unshift(operation);
			}
		});
	}
	removeBlockers() {
		if (this.queues === null) return;
		[
			this.queues.video,
			this.queues.audio,
			this.queues.audiovideo
		].forEach((queue) => {
			var _queue$;
			const label = (_queue$ = queue[0]) == null ? void 0 : _queue$.label;
			if (label === "async-blocker" || label === "async-blocker-prepend") {
				queue[0].execute();
				queue.splice(0, 1);
			} else if (label === "block-audio") queue.splice(0, 1);
		});
	}
	insertNext(operations, type) {
		if (this.queues === null) return;
		this.queues[type].splice(1, 0, ...operations);
	}
	unblockAudio() {
		var _this$current;
		if (this.queues === null) return;
		if (((_this$current = this.current("audio")) == null ? void 0 : _this$current.label) === "block-audio") this.shiftAndExecuteNext("audio");
	}
	audioBlocking() {
		if (this.queues === null) return false;
		return this.queues.audio.some((op) => op.label === "block-audio");
	}
	executeNext(type) {
		if (this.queues === null || this.tracks === null) return;
		const queue = this.queues[type];
		if (queue.length) {
			const operation = queue[0];
			try {
				operation.execute();
			} catch (error) {
				var _this$tracks$type;
				operation.onError(error);
				if (this.queues === null || this.tracks === null) return;
				const sb = (_this$tracks$type = this.tracks[type]) == null ? void 0 : _this$tracks$type.buffer;
				if (!(sb != null && sb.updating)) this.shiftAndExecuteNext(type);
			}
		}
	}
	shiftAndExecuteNext(type) {
		if (this.queues === null) return;
		this.queues[type].shift();
		this.executeNext(type);
	}
	current(type) {
		var _this$queues;
		return ((_this$queues = this.queues) == null ? void 0 : _this$queues[type][0]) || null;
	}
	toString() {
		const { queues, tracks } = this;
		if (queues === null || tracks === null) return `<destroyed>`;
		return `
${this.list("video")}
${this.list("audio")}
${this.list("audiovideo")}}`;
	}
	list(type) {
		var _this$queues2, _this$tracks;
		return (_this$queues2 = this.queues) != null && _this$queues2[type] || (_this$tracks = this.tracks) != null && _this$tracks[type] ? `${type}: (${this.listSbInfo(type)}) ${this.listOps(type)}` : "";
	}
	listSbInfo(type) {
		var _this$tracks2;
		const track = (_this$tracks2 = this.tracks) == null ? void 0 : _this$tracks2[type];
		const sb = track == null ? void 0 : track.buffer;
		if (!sb) return "none";
		return `SourceBuffer${sb.updating ? " updating" : ""}${track.ended ? " ended" : ""}${track.ending ? " ending" : ""}`;
	}
	listOps(type) {
		var _this$queues3;
		return ((_this$queues3 = this.queues) == null ? void 0 : _this$queues3[type].map((op) => op.label).join(", ")) || "";
	}
};
/**
* Provides methods dealing with buffer length retrieval for example.
*
* In general, a helper around HTML5 MediaElement TimeRanges gathered from `buffered` property.
*
* Also @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/buffered
*/
var noopBuffered = {
	length: 0,
	start: () => 0,
	end: () => 0
};
var BufferHelper = class BufferHelper {
	/**
	* Return true if `media`'s buffered include `position`
	*/
	static isBuffered(media, position) {
		if (media) {
			const buffered = BufferHelper.getBuffered(media);
			for (let i = buffered.length; i--;) if (position >= buffered.start(i) && position <= buffered.end(i)) return true;
		}
		return false;
	}
	static bufferedRanges(media) {
		if (media) {
			const timeRanges = BufferHelper.getBuffered(media);
			return BufferHelper.timeRangesToArray(timeRanges);
		}
		return [];
	}
	static timeRangesToArray(timeRanges) {
		const buffered = [];
		for (let i = 0; i < timeRanges.length; i++) buffered.push({
			start: timeRanges.start(i),
			end: timeRanges.end(i)
		});
		return buffered;
	}
	static bufferInfo(media, pos, maxHoleDuration) {
		if (media) {
			const buffered = BufferHelper.bufferedRanges(media);
			if (buffered.length) return BufferHelper.bufferedInfo(buffered, pos, maxHoleDuration);
		}
		return {
			len: 0,
			start: pos,
			end: pos,
			bufferedIndex: -1
		};
	}
	static bufferedInfo(buffered, pos, maxHoleDuration) {
		pos = Math.max(0, pos);
		if (buffered.length > 1) buffered.sort((a, b) => a.start - b.start || b.end - a.end);
		let bufferedIndex = -1;
		let buffered2 = [];
		if (maxHoleDuration) for (let i = 0; i < buffered.length; i++) {
			if (pos >= buffered[i].start && pos <= buffered[i].end) bufferedIndex = i;
			const buf2len = buffered2.length;
			if (buf2len) {
				const buf2end = buffered2[buf2len - 1].end;
				if (buffered[i].start - buf2end < maxHoleDuration) {
					if (buffered[i].end > buf2end) buffered2[buf2len - 1].end = buffered[i].end;
				} else buffered2.push(buffered[i]);
			} else buffered2.push(buffered[i]);
		}
		else buffered2 = buffered;
		let bufferLen = 0;
		let nextStart;
		let bufferStart = pos;
		let bufferEnd = pos;
		for (let i = 0; i < buffered2.length; i++) {
			const start = buffered2[i].start;
			const end = buffered2[i].end;
			if (bufferedIndex === -1 && pos >= start && pos <= end) bufferedIndex = i;
			if (pos + maxHoleDuration >= start && pos < end) {
				bufferStart = start;
				bufferEnd = end;
				bufferLen = bufferEnd - pos;
			} else if (pos + maxHoleDuration < start) {
				nextStart = start;
				break;
			}
		}
		return {
			len: bufferLen,
			start: bufferStart || 0,
			end: bufferEnd || 0,
			nextStart,
			buffered,
			bufferedIndex
		};
	}
	/**
	* Safe method to get buffered property.
	* SourceBuffer.buffered may throw if SourceBuffer is removed from it's MediaSource
	*/
	static getBuffered(media) {
		try {
			return media.buffered || noopBuffered;
		} catch (e) {
			logger.log("failed to get media.buffered", e);
			return noopBuffered;
		}
	}
};
function addEventListener(el, type, listener) {
	removeEventListener(el, type, listener);
	el.addEventListener(type, listener);
}
function removeEventListener(el, type, listener) {
	el.removeEventListener(type, listener);
}
/**
*  TimeRanges to string helper
*/
function timeRangesToString(r) {
	let log = "";
	const len = r.length;
	for (let i = 0; i < len; i++) log += `[${r.start(i).toFixed(3)}-${r.end(i).toFixed(3)}]`;
	return log;
}
var VIDEO_CODEC_PROFILE_REPLACE = /(avc[1234]|hvc1|hev1|dvh[1e]|vp09|av01)(?:\.[^.,]+)+/;
var TRACK_REMOVED_ERROR_NAME = "HlsJsTrackRemovedError";
var SOURCE_BUFFER_ERROR_NAME = "HlsJsSourceBufferError";
var LOOP_FLUSH_SAFETY_MARGIN = .25;
var MIN_BUFFERED_PROGRESS = .001;
var HlsJsTrackRemovedError = class extends Error {
	constructor(message) {
		super(message);
		this.name = TRACK_REMOVED_ERROR_NAME;
	}
};
var BufferController = class extends Logger {
	constructor(hls, fragmentTracker) {
		super("buffer-controller", hls.logger);
		this.hls = void 0;
		this.fragmentTracker = void 0;
		this.fragmentAppendProgress = Object.create(null);
		this.appendsWithoutProgress = Object.create(null);
		this.details = null;
		this._objectUrl = null;
		this.operationQueue = null;
		this.bufferCodecEventsTotal = 0;
		this.media = null;
		this.mediaSource = null;
		this.lastMpegAudioChunk = null;
		this.lastVideoAppendEnd = 0;
		this.appendSource = void 0;
		this.transferData = void 0;
		this.overrides = void 0;
		this.appendErrors = {
			audio: 0,
			video: 0,
			audiovideo: 0
		};
		this.appendError = void 0;
		this._quotaEvictionPending = {};
		this.tracks = {};
		this.sourceBuffers = [[null, null], [null, null]];
		this._onEndStreaming = (event) => {
			var _this$mediaSource;
			if (!this.hls) return;
			if (((_this$mediaSource = this.mediaSource) == null ? void 0 : _this$mediaSource.readyState) !== "open") return;
			if (!this.media || this.media.seeking) return;
			this.hls.pauseBuffering();
		};
		this._onStartStreaming = (event) => {
			if (!this.hls) return;
			this.hls.resumeBuffering();
		};
		this._onMediaSourceOpen = (e) => {
			const { media, mediaSource } = this;
			if (e) this.log("Media source opened");
			if (!media || !mediaSource) return;
			removeEventListener(mediaSource, "sourceopen", this._onMediaSourceOpen);
			removeEventListener(media, "emptied", this._onMediaEmptied);
			this.updateDuration();
			this.hls.trigger(Events.MEDIA_ATTACHED, {
				media,
				mediaSource
			});
			if (this.mediaSource !== null) this.checkPendingTracks();
		};
		this._onMediaSourceClose = () => {
			this.log("Media source closed");
			if (this.media) {
				if (this.isMediaSourceReplaced()) {
					const { currentSrc } = this.media;
					const newSrc = currentSrc && currentSrc !== this._objectUrl ? currentSrc : this.mediaSrc;
					this.warn(`MediaSource closed after media element switched to another source (${this._objectUrl} > ${newSrc}) - detaching media`);
					this.hls.detachMedia();
					return;
				}
				const mediaError = this.media.error;
				const { appendError, appendErrors } = this;
				let fatal = false;
				if (!appendError && mediaError) fatal = Math.max(++appendErrors.audio, ++appendErrors.video, ++appendErrors.audiovideo) >= this.hls.config.appendErrorMaxRetry;
				const error = /* @__PURE__ */ new Error(`MediaSource closed while media attached${mediaErrorRecoveryMessage(fatal, mediaError)}`);
				this.warn(error);
				this.hls.trigger(Events.ERROR, _extends({ fatal }, appendError, {
					type: ErrorTypes.MEDIA_ERROR,
					details: ErrorDetails.MEDIA_SOURCE_REQUIRES_RESET,
					error
				}));
			}
		};
		this._onMediaSourceEnded = () => {
			this.log("Media source ended");
		};
		this._onMediaEmptied = () => {
			const { mediaSrc, _objectUrl } = this;
			if (mediaSrc !== _objectUrl) this.error(`Media element src was set while attaching MediaSource (${_objectUrl} > ${mediaSrc})`);
		};
		this._onMediaError = () => {
			const { media } = this;
			if (media) {
				var _media$error, _media$error2;
				this.log(`Media error (code: ${(_media$error = media.error) == null ? void 0 : _media$error.code}): ${(_media$error2 = media.error) == null ? void 0 : _media$error2.message}`);
			}
		};
		this.hls = hls;
		this.fragmentTracker = fragmentTracker;
		this.appendSource = isManagedMediaSource(getMediaSource(hls.config.preferManagedMediaSource));
		this.initTracks();
		this.registerListeners();
	}
	hasSourceTypes() {
		return Object.keys(this.tracks).length > 0;
	}
	destroy() {
		this.unregisterListeners();
		this.details = null;
		this.lastMpegAudioChunk = null;
		this.transferData = this.overrides = void 0;
		if (this.operationQueue) {
			this.operationQueue.destroy();
			this.operationQueue = null;
		}
		this.hls = this.fragmentTracker = null;
		this._onMediaSourceOpen = this._onMediaSourceClose = null;
		this._onMediaSourceEnded = null;
		this._onStartStreaming = this._onEndStreaming = null;
		this._onMediaEmptied = this._onMediaError = null;
	}
	registerListeners() {
		const { hls } = this;
		hls.on(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
		hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
		hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
		hls.on(Events.BUFFER_RESET, this.onBufferReset, this);
		hls.on(Events.BUFFER_APPENDING, this.onBufferAppending, this);
		hls.on(Events.BUFFER_CODECS, this.onBufferCodecs, this);
		hls.on(Events.BUFFER_EOS, this.onBufferEos, this);
		hls.on(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
		hls.on(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
		hls.on(Events.FRAG_PARSED, this.onFragParsed, this);
		hls.on(Events.FRAG_CHANGED, this.onFragChanged, this);
		hls.on(Events.ERROR, this.onError, this);
	}
	unregisterListeners() {
		const { hls } = this;
		hls.off(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
		hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
		hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
		hls.off(Events.BUFFER_RESET, this.onBufferReset, this);
		hls.off(Events.BUFFER_APPENDING, this.onBufferAppending, this);
		hls.off(Events.BUFFER_CODECS, this.onBufferCodecs, this);
		hls.off(Events.BUFFER_EOS, this.onBufferEos, this);
		hls.off(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
		hls.off(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
		hls.off(Events.FRAG_PARSED, this.onFragParsed, this);
		hls.off(Events.FRAG_CHANGED, this.onFragChanged, this);
		hls.off(Events.ERROR, this.onError, this);
	}
	transferMedia() {
		const { media, mediaSource } = this;
		if (!media) return null;
		const tracks = {};
		if (this.operationQueue) {
			const updating = this.isUpdating();
			if (!updating) this.operationQueue.removeBlockers();
			const queued = this.isQueued();
			if (updating || queued) this.warn(`Transfering MediaSource with${queued ? " operations in queue" : ""}${updating ? " updating SourceBuffer(s)" : ""} ${this.operationQueue}`);
			this.operationQueue.destroy();
		}
		const transferData = this.transferData;
		if (transferData && !this.sourceBufferCount && transferData.mediaSource === mediaSource) _extends(tracks, transferData.tracks);
		else this.sourceBuffers.forEach((tuple) => {
			const [type] = tuple;
			if (type) {
				tracks[type] = _extends({}, this.tracks[type]);
				this.removeBuffer(type);
			}
			tuple[0] = tuple[1] = null;
		});
		return {
			media,
			mediaSource,
			tracks
		};
	}
	initTracks() {
		const tracks = {};
		this.resetAppendProgress();
		this.sourceBuffers = [[null, null], [null, null]];
		this.tracks = tracks;
		this.resetQueue();
		this.lastMpegAudioChunk = null;
		this.lastVideoAppendEnd = 0;
	}
	onManifestLoading() {
		this.bufferCodecEventsTotal = 0;
		this.details = null;
		this.resetAppendErrors();
		this.resetAppendProgress();
	}
	onManifestParsed(event, data) {
		var _this$transferData;
		let codecEvents = 2;
		if (data.audio && !data.video || !data.altAudio) codecEvents = 1;
		this.bufferCodecEventsTotal = codecEvents;
		this.log(`${codecEvents} bufferCodec event(s) expected.`);
		if ((_this$transferData = this.transferData) != null && _this$transferData.mediaSource && this.sourceBufferCount && codecEvents) this.bufferCreated();
	}
	onMediaAttaching(event, data) {
		const media = this.media = data.media;
		this.transferData = this.overrides = void 0;
		const MediaSource = getMediaSource(this.appendSource);
		if (MediaSource) {
			const transferringMedia = !!data.mediaSource;
			if (transferringMedia || data.overrides) {
				this.transferData = data;
				this.overrides = data.overrides;
			}
			const ms = this.mediaSource = data.mediaSource || new MediaSource();
			this.assignMediaSource(ms);
			if (transferringMedia) {
				this._objectUrl = media.src;
				this.attachTransferred();
			} else {
				var _config$emeController;
				const objectUrl = this._objectUrl = self.URL.createObjectURL(ms);
				const config = this.hls.config;
				const cleanupPromise = config.emeEnabled && media.mediaKeys ? (_config$emeController = config.emeController) == null ? void 0 : _config$emeController.CDMCleanupPromise : null;
				if (cleanupPromise) cleanupPromise.then(() => {
					if (!this.hls) return;
					this.setSource(media, ms, objectUrl);
				}).catch(() => {});
				else this.setSource(media, ms, objectUrl);
			}
			addEventListener(media, "emptied", this._onMediaEmptied);
			addEventListener(media, "error", this._onMediaError);
			if (this.appendSource) addEventListener(media, "seeking", this._onStartStreaming);
		}
	}
	setSource(media, ms, objectUrl) {
		if (this.appendSource) try {
			media.removeAttribute("src");
			const MMS = self.ManagedMediaSource;
			media.disableRemotePlayback = media.disableRemotePlayback || MMS && ms instanceof MMS;
			removeSourceChildren(media);
			addSource(media, objectUrl);
			media.load();
		} catch (error) {
			media.src = objectUrl;
		}
		else media.src = objectUrl;
	}
	assignMediaSource(ms) {
		var _this$transferData2, _ms$constructor;
		this.log(`${((_this$transferData2 = this.transferData) == null ? void 0 : _this$transferData2.mediaSource) === ms ? "transferred" : "created"} media source: ${(_ms$constructor = ms.constructor) == null ? void 0 : _ms$constructor.name}`);
		addEventListener(ms, "sourceopen", this._onMediaSourceOpen);
		addEventListener(ms, "sourceended", this._onMediaSourceEnded);
		addEventListener(ms, "sourceclose", this._onMediaSourceClose);
		if (this.appendSource) {
			addEventListener(ms, "startstreaming", this._onStartStreaming);
			addEventListener(ms, "endstreaming", this._onEndStreaming);
		}
	}
	attachTransferred() {
		const media = this.media;
		const data = this.transferData;
		if (!data || !media) return;
		const requiredTracks = this.tracks;
		const transferredTracks = data.tracks;
		const trackNames = transferredTracks ? Object.keys(transferredTracks) : null;
		const trackCount = trackNames ? trackNames.length : 0;
		const mediaSourceOpenCallback = () => {
			Promise.resolve().then(() => {
				if (this.media && this.mediaSourceOpenOrEnded) this._onMediaSourceOpen();
			});
		};
		if (transferredTracks && trackNames && trackCount) {
			if (!this.tracksReady) {
				this.hls.config.startFragPrefetch = true;
				this.log(`attachTransferred: waiting for SourceBuffer track info`);
				return;
			}
			this.log(`attachTransferred: (bufferCodecEventsTotal ${this.bufferCodecEventsTotal})
required tracks: ${stringify(requiredTracks, (key, value) => key === "initSegment" ? void 0 : value)};
transfer tracks: ${stringify(transferredTracks, (key, value) => key === "initSegment" ? void 0 : value)}}`);
			if (!isCompatibleTrackChange(transferredTracks, requiredTracks)) {
				data.mediaSource = null;
				data.tracks = void 0;
				const currentTime = media.currentTime;
				const details = this.details;
				const startTime = Math.max(currentTime, (details == null ? void 0 : details.fragments[0].start) || 0);
				if (startTime - currentTime > 1) {
					this.log(`attachTransferred: waiting for playback to reach new tracks start time ${currentTime} -> ${startTime}`);
					return;
				}
				this.warn(`attachTransferred: resetting MediaSource for incompatible tracks ("${Object.keys(transferredTracks)}"->"${Object.keys(requiredTracks)}") start time: ${startTime} currentTime: ${currentTime}`);
				this.onMediaDetaching(Events.MEDIA_DETACHING, {});
				this.onMediaAttaching(Events.MEDIA_ATTACHING, data);
				media.currentTime = startTime;
				return;
			}
			this.transferData = void 0;
			trackNames.forEach((trackName) => {
				const type = trackName;
				const track = transferredTracks[type];
				if (track) {
					const sb = track.buffer;
					if (sb) {
						const fragmentTracker = this.fragmentTracker;
						const playlistType = track.id;
						if (fragmentTracker.hasFragments(playlistType) || fragmentTracker.hasParts(playlistType)) {
							const bufferedTimeRanges = BufferHelper.getBuffered(sb);
							fragmentTracker.detectEvictedFragments(type, bufferedTimeRanges, playlistType, null, null, true);
						}
						const sbIndex = sourceBufferNameToIndex(type);
						const sbTuple = [type, sb];
						this.sourceBuffers[sbIndex] = sbTuple;
						if (sb.updating && this.operationQueue) this.operationQueue.prependBlocker(type);
						this.trackSourceBuffer(type, track);
					}
				}
			});
			mediaSourceOpenCallback();
			this.bufferCreated();
		} else {
			this.log(`attachTransferred: MediaSource w/o SourceBuffers`);
			mediaSourceOpenCallback();
		}
	}
	get mediaSourceOpenOrEnded() {
		var _this$mediaSource2;
		const readyState = (_this$mediaSource2 = this.mediaSource) == null ? void 0 : _this$mediaSource2.readyState;
		return readyState === "open" || readyState === "ended";
	}
	onMediaDetaching(event, data) {
		const transferringMedia = !!data.transferMedia;
		this.transferData = this.overrides = void 0;
		const { media, mediaSource, _objectUrl } = this;
		if (mediaSource) {
			this.log(`media source ${transferringMedia ? "transferring" : "detaching"}`);
			if (transferringMedia) {
				this.sourceBuffers.forEach(([type]) => {
					if (type) this.removeBuffer(type);
				});
				this.resetQueue();
			} else {
				if (this.mediaSourceOpenOrEnded) {
					const open = mediaSource.readyState === "open";
					try {
						const sourceBuffers = mediaSource.sourceBuffers;
						for (let i = sourceBuffers.length; i--;) {
							if (open) sourceBuffers[i].abort();
							mediaSource.removeSourceBuffer(sourceBuffers[i]);
						}
						if (open) mediaSource.endOfStream();
					} catch (err) {
						this.warn(`onMediaDetaching: ${err.message} while calling endOfStream`);
					}
				}
				if (this.sourceBufferCount) this.onBufferReset();
			}
			removeEventListener(mediaSource, "sourceopen", this._onMediaSourceOpen);
			removeEventListener(mediaSource, "sourceended", this._onMediaSourceEnded);
			removeEventListener(mediaSource, "sourceclose", this._onMediaSourceClose);
			if (this.appendSource) {
				removeEventListener(mediaSource, "startstreaming", this._onStartStreaming);
				removeEventListener(mediaSource, "endstreaming", this._onEndStreaming);
			}
			this.mediaSource = null;
			this._objectUrl = null;
		}
		if (media) {
			removeEventListener(media, "emptied", this._onMediaEmptied);
			removeEventListener(media, "error", this._onMediaError);
			removeEventListener(media, "seeking", this._onStartStreaming);
			if (!transferringMedia) {
				if (_objectUrl) self.URL.revokeObjectURL(_objectUrl);
				if (this.mediaSrc === _objectUrl && !this.isMediaSourceReplaced(_objectUrl)) {
					media.removeAttribute("src");
					if (this.appendSource) removeSourceChildren(media);
					media.load();
				} else this.warn("media|source.src was changed by a third party - skip cleanup");
			}
			this.media = null;
		}
	}
	onBufferReset() {
		this.sourceBuffers.forEach(([type]) => {
			if (type) this.resetBuffer(type);
		});
		this.initTracks();
	}
	resetBuffer(type) {
		var _this$tracks$type;
		const sb = (_this$tracks$type = this.tracks[type]) == null ? void 0 : _this$tracks$type.buffer;
		this.removeBuffer(type);
		if (sb) try {
			var _this$mediaSource3;
			if ((_this$mediaSource3 = this.mediaSource) != null && _this$mediaSource3.sourceBuffers.length) this.mediaSource.removeSourceBuffer(sb);
		} catch (err) {
			this.warn(`onBufferReset ${type}`, err);
		}
		delete this.tracks[type];
	}
	removeBuffer(type) {
		this.removeBufferListeners(type);
		this.sourceBuffers[sourceBufferNameToIndex(type)] = [null, null];
		const track = this.tracks[type];
		if (track) {
			this.clearBufferAppendTimeoutId(track);
			track.buffer = void 0;
		}
	}
	resetQueue() {
		if (this.operationQueue) this.operationQueue.destroy();
		this.operationQueue = new BufferOperationQueue(this.tracks);
	}
	onBufferCodecs(event, data) {
		var _data$audio;
		const tracks = this.tracks;
		const trackNames = Object.keys(data);
		this.log(`BUFFER_CODECS: "${trackNames}" (current SB count ${this.sourceBufferCount})`);
		const unmuxedToMuxed = "audiovideo" in data && (tracks.audio || tracks.video) || tracks.audiovideo && ("audio" in data || "video" in data);
		const muxedToUnmuxed = !unmuxedToMuxed && this.sourceBufferCount && this.media && trackNames.some((sbName) => !tracks[sbName]);
		if (unmuxedToMuxed || muxedToUnmuxed) {
			this.warn(`Unsupported transition between "${Object.keys(tracks)}" and "${trackNames}" SourceBuffers`);
			return;
		}
		trackNames.forEach((trackName) => {
			var _this$transferData3, _trackCodec;
			const { id, codec, levelCodec, container, metadata, supplemental } = data[trackName];
			let track = tracks[trackName];
			const transferredTrack = (_this$transferData3 = this.transferData) == null || (_this$transferData3 = _this$transferData3.tracks) == null ? void 0 : _this$transferData3[trackName];
			const sbTrack = transferredTrack != null && transferredTrack.buffer ? transferredTrack : track;
			const sbCodec = (sbTrack == null ? void 0 : sbTrack.pendingCodec) || (sbTrack == null ? void 0 : sbTrack.codec);
			const trackLevelCodec = sbTrack == null ? void 0 : sbTrack.levelCodec;
			if (!track) track = tracks[trackName] = {
				buffer: void 0,
				listeners: [],
				codec,
				supplemental,
				container,
				levelCodec,
				metadata,
				id
			};
			const currentCodecFull = pickMostCompleteCodecName(sbCodec, trackLevelCodec);
			const currentCodec = currentCodecFull == null ? void 0 : currentCodecFull.replace(VIDEO_CODEC_PROFILE_REPLACE, "$1");
			let trackCodec = pickMostCompleteCodecName(codec, levelCodec);
			const nextCodec = (_trackCodec = trackCodec) == null ? void 0 : _trackCodec.replace(VIDEO_CODEC_PROFILE_REPLACE, "$1");
			if (trackCodec && currentCodecFull && currentCodec !== nextCodec) {
				if (trackName.slice(0, 5) === "audio") trackCodec = getCodecCompatibleName(trackCodec, this.appendSource);
				this.log(`switching codec ${sbCodec} to ${trackCodec}`);
				if (trackCodec !== (track.pendingCodec || track.codec)) track.pendingCodec = trackCodec;
				track.container = container;
				this.appendChangeType(trackName, container, trackCodec);
			}
		});
		if (this.tracksReady || this.sourceBufferCount) data.tracks = this.sourceBufferTracks;
		if (this.sourceBufferCount) return;
		if (this.bufferCodecEventsTotal > 1 && !this.tracks.video && !data.video && ((_data$audio = data.audio) == null ? void 0 : _data$audio.id) === "main") {
			this.log(`Main audio-only`);
			this.bufferCodecEventsTotal = 1;
		}
		if (this.mediaSourceOpenOrEnded) this.checkPendingTracks();
	}
	get sourceBufferTracks() {
		return Object.keys(this.tracks).reduce((baseTracks, type) => {
			const track = this.tracks[type];
			baseTracks[type] = {
				id: track.id,
				container: track.container,
				codec: track.codec,
				levelCodec: track.levelCodec
			};
			return baseTracks;
		}, {});
	}
	appendChangeType(type, container, codec) {
		const mimeType = `${container};codecs=${codec}`;
		const operation = {
			label: `change-type=${mimeType}`,
			execute: () => {
				const track = this.tracks[type];
				if (track) {
					const sb = track.buffer;
					if (sb != null && sb.changeType) {
						this.log(`changing ${type} sourceBuffer type to ${mimeType}`);
						sb.changeType(mimeType);
						track.codec = codec;
						track.container = container;
					}
				}
				this.shiftAndExecuteNext(type);
			},
			onStart: () => {},
			onComplete: () => {},
			onError: (error) => {
				this.warn(`Failed to change ${type} SourceBuffer type`, error);
			}
		};
		this.append(operation, type, this.isPending(this.tracks[type]));
	}
	blockAudio(partOrFrag) {
		var _this$fragmentTracker;
		const pStart = partOrFrag.start;
		const pTime = pStart + partOrFrag.duration * .05;
		if (((_this$fragmentTracker = this.fragmentTracker.getAppendedFrag(pStart, PlaylistLevelType.MAIN)) == null ? void 0 : _this$fragmentTracker.gap) === true) return;
		this.append({
			label: "block-audio",
			execute: () => {
				var _this$tracks$video, _this$fragmentTracker2;
				if (this.lastVideoAppendEnd > pTime || BufferHelper.isBuffered((_this$tracks$video = this.tracks.video) == null ? void 0 : _this$tracks$video.buffer, pTime) || ((_this$fragmentTracker2 = this.fragmentTracker.getAppendedFrag(pTime, PlaylistLevelType.MAIN)) == null ? void 0 : _this$fragmentTracker2.gap) === true) this.unblockAudio();
			},
			onStart: () => {},
			onComplete: () => {},
			onError: (error) => {
				this.warn("Error executing block-audio operation", error);
			}
		}, "audio", true);
	}
	unblockAudio() {
		if (this.operationQueue) this.operationQueue.unblockAudio();
	}
	onBufferAppending(event, eventData) {
		const { tracks } = this;
		const { data, type, parent, frag, part, chunkMeta, offset } = eventData;
		const chunkStats = chunkMeta.buffering[type];
		const trackProgress = isMediaFragment(frag) && !part && !frag.gap && !chunkMeta.partial && !chunkMeta.iframe;
		let bufferedBefore = null;
		let fullyBufferedBefore = false;
		const { sn, cc } = frag;
		const bufferAppendingStart = self.performance.now();
		chunkStats.start = bufferAppendingStart;
		const fragBuffering = frag.stats.buffering;
		const partBuffering = part ? part.stats.buffering : null;
		if (fragBuffering.start === 0) fragBuffering.start = bufferAppendingStart;
		if ((partBuffering == null ? void 0 : partBuffering.start) === 0) partBuffering.start = bufferAppendingStart;
		const audioTrack = tracks.audio;
		let checkTimestampOffset = false;
		if (type === "audio" && (audioTrack == null ? void 0 : audioTrack.container) === "audio/mpeg") {
			checkTimestampOffset = !this.lastMpegAudioChunk || chunkMeta.id === 1 || this.lastMpegAudioChunk.sn !== chunkMeta.sn;
			this.lastMpegAudioChunk = chunkMeta;
		}
		const videoTrack = tracks.video;
		const videoSb = videoTrack == null ? void 0 : videoTrack.buffer;
		if (videoSb && sn !== "initSegment" && offset !== void 0) {
			const audioSb = audioTrack == null ? void 0 : audioTrack.buffer;
			const partOrFrag = part || frag;
			if (type === "audio" && parent !== "main" && !(videoTrack.ending || videoTrack.ended) && audioSb && BufferHelper.getBuffered(audioSb).length) {
				const pTime = partOrFrag.start + partOrFrag.duration * .05;
				const vbuffered = BufferHelper.getBuffered(videoSb);
				const vappending = this.currentOp("video");
				if (!vbuffered.length && !vappending) this.blockAudio(partOrFrag);
				else if (!BufferHelper.isBuffered(videoSb, pTime) && this.lastVideoAppendEnd < pTime) this.blockAudio(partOrFrag);
			} else if (type === "video") {
				const videoAppendEnd = partOrFrag.end;
				const diff = this.lastVideoAppendEnd - videoAppendEnd;
				this.lastVideoAppendEnd = videoAppendEnd;
				if (diff < 0 || diff > partOrFrag.duration) this.unblockAudio();
				else if (this.isAudioBlocked()) this.executeNext("audio");
			}
		}
		const fragStart = (part || frag).start;
		const operation = {
			label: `append-${type}`,
			execute: () => {
				var _this$tracks$type2;
				chunkStats.executeStart = self.performance.now();
				const sb = (_this$tracks$type2 = this.tracks[type]) == null ? void 0 : _this$tracks$type2.buffer;
				if (sb) {
					if (trackProgress) {
						bufferedBefore = BufferHelper.timeRangesToArray(BufferHelper.getBuffered(sb));
						fullyBufferedBefore = isFragmentFullyBuffered(fragmentBufferedCoverage(bufferedBefore, frag), frag);
					}
					if (checkTimestampOffset) this.updateTimestampOffset(sb, fragStart, .1, type, sn, cc);
					else if (offset !== void 0 && isFiniteNumber(offset)) this.updateTimestampOffset(sb, offset, 1e-6, type, sn, cc);
				}
				this.appendExecutor(data, type);
			},
			onStart: () => {},
			onComplete: () => {
				this.clearBufferAppendTimeoutId(this.tracks[type]);
				const end = self.performance.now();
				chunkStats.executeEnd = chunkStats.end = end;
				if (fragBuffering.first === 0) fragBuffering.first = end;
				if ((partBuffering == null ? void 0 : partBuffering.first) === 0) partBuffering.first = end;
				const timeRanges = {};
				this.sourceBuffers.forEach(([type, sb]) => {
					if (type) timeRanges[type] = BufferHelper.getBuffered(sb);
				});
				if (trackProgress) {
					const progress = this.getFragmentAppendProgress(frag);
					const buffered = timeRanges[type];
					if (buffered && bufferedBefore) {
						const coverageAfter = fragmentBufferedCoverage(BufferHelper.timeRangesToArray(buffered), frag);
						progress.progressed || (progress.progressed = coverageAfter - fragmentBufferedCoverage(bufferedBefore, frag) > MIN_BUFFERED_PROGRESS);
						const fullyBuffered = fullyBufferedBefore && isFragmentFullyBuffered(coverageAfter, frag);
						progress.fullyBuffered[type] = progress.fullyBuffered[type] === void 0 ? fullyBuffered : progress.fullyBuffered[type] && fullyBuffered;
					}
				}
				this.hls.trigger(Events.BUFFER_APPENDED, {
					type,
					frag,
					part,
					chunkMeta,
					parent,
					timeRanges
				});
			},
			onError: (error) => {
				var _this$media;
				this.clearBufferAppendTimeoutId(this.tracks[type]);
				const isQuotaError = error.code === DOMException.QUOTA_EXCEEDED_ERR || error.name == "QuotaExceededError" || `quota` in error;
				if (isQuotaError) {
					if (!this._quotaEvictionPending[type]) {
						const evictEnd = this.getBackBufferEvictionTarget(type, data.byteLength, frag.type);
						if (evictEnd > 0) {
							this._quotaEvictionPending[type] = true;
							this.log(`QuotaExceededError on "${type}" append sn: ${sn} - evicting back buffer to ${evictEnd.toFixed(3)}s and retrying`);
							const removeOp = this.getFlushOp(type, 0, evictEnd);
							const clearOp = this.getClearEvictionPendingOp(type);
							this.insertNext([
								removeOp,
								operation,
								clearOp
							], type);
							return;
						}
						this.warn(`QuotaExceededError on "${type}" sn: ${sn} - no back buffer available to evict`);
					}
				}
				if (trackProgress) this.getFragmentAppendProgress(frag).errored = true;
				const event = {
					type: ErrorTypes.MEDIA_ERROR,
					parent,
					details: ErrorDetails.BUFFER_APPEND_ERROR,
					sourceBufferName: type,
					frag,
					part,
					chunkMeta,
					error,
					err: error,
					fatal: false
				};
				const mediaError = (_this$media = this.media) == null ? void 0 : _this$media.error;
				if (error.name === TRACK_REMOVED_ERROR_NAME && this.sourceBufferCount === 0 && (!this.media || this.pendingTrackCount === 0)) event.errorAction = createDoNothingErrorAction(true);
				else {
					var _this$mediaSource4;
					if (isQuotaError) event.details = ErrorDetails.BUFFER_FULL_ERROR;
					const appendErrorCount = ++this.appendErrors[type];
					const appendErrorMaxRetry = this.hls.config.appendErrorMaxRetry;
					this.warn(`Failed ${appendErrorCount}/${appendErrorMaxRetry + 1} times to append segment in "${type}" sourceBuffer with error: ${error.message}`);
					if (appendErrorCount >= appendErrorMaxRetry) event.fatal = !isQuotaError;
					const readyState = (_this$mediaSource4 = this.mediaSource) == null ? void 0 : _this$mediaSource4.readyState;
					if ((readyState === "ended" || readyState === "closed" || !!mediaError) && !this.isMediaSourceReplaced()) {
						this.warn(`MediaSource readyState "${readyState}" during SourceBuffer${mediaErrorRecoveryMessage(event.fatal, mediaError)}`);
						event.details = ErrorDetails.MEDIA_SOURCE_REQUIRES_RESET;
					}
				}
				this.appendError = event;
				this.hls.trigger(Events.ERROR, event);
				if (isQuotaError && this.hls) this.trimBuffers(frag.start, 1);
			}
		};
		this.log(`queuing "${type}" append sn: ${sn}${part ? " p: " + part.index : ""} of ${parent} playlist ${frag.level} cc: ${cc} offset: ${offset} bytes: ${data.byteLength}`);
		this.append(operation, type, this.isPending(this.tracks[type]));
	}
	getClearEvictionPendingOp(type) {
		return {
			label: "clear",
			execute: () => {
				this._quotaEvictionPending[type] = false;
				this.shiftAndExecuteNext(type);
			},
			onStart: () => {},
			onComplete: () => {},
			onError: () => {}
		};
	}
	getFlushOp(type, start, end) {
		this.log(`queuing "${type}" remove ${start}-${end}`);
		return {
			label: "remove",
			execute: () => {
				this.removeExecutor(type, start, end);
			},
			onStart: () => {},
			onComplete: () => {
				var _this$tracks$type3;
				const sb = (_this$tracks$type3 = this.tracks[type]) == null ? void 0 : _this$tracks$type3.buffer;
				this.log(`Remove request ${start}-${end} from ${type} Source Buffer complete > buffer: ${sb ? timeRangesToString(BufferHelper.getBuffered(sb)) : "(detached)"}`);
				this.hls.trigger(Events.BUFFER_FLUSHED, {
					type,
					start,
					end
				});
			},
			onError: (error) => {
				this.warn(`Failed to remove ${start}-${end} from "${type}" SourceBuffer`, error);
				this.hls.trigger(Events.BUFFER_FLUSHED, {
					type,
					start: 0,
					end: 0,
					error
				});
			}
		};
	}
	onBufferFlushing(event, data) {
		const { type, startOffset, endOffset } = data;
		if (!type || type === "audio") this.unblockAudio();
		if (type) this.append(this.getFlushOp(type, startOffset, endOffset), type);
		else this.sourceBuffers.forEach(([type]) => {
			if (type) this.append(this.getFlushOp(type, startOffset, endOffset), type);
		});
	}
	onFragParsed(event, data) {
		const { frag, part, chunkMeta } = data;
		const buffersAppendedTo = [];
		const elementaryStreams = part ? part.elementaryStreams : frag.elementaryStreams;
		if (elementaryStreams[ElementaryStreamTypes.AUDIOVIDEO]) buffersAppendedTo.push("audiovideo");
		else {
			if (elementaryStreams[ElementaryStreamTypes.AUDIO]) buffersAppendedTo.push("audio");
			if (elementaryStreams[ElementaryStreamTypes.VIDEO]) buffersAppendedTo.push("video");
		}
		const onUnblocked = () => {
			const now = self.performance.now();
			frag.stats.buffering.end = now;
			if (part) part.stats.buffering.end = now;
			const stats = part ? part.stats : frag.stats;
			this.checkAppendProgress(frag, part, chunkMeta, buffersAppendedTo);
			if (!this.hls) return;
			this.hls.trigger(Events.FRAG_BUFFERED, {
				frag,
				part,
				stats,
				id: frag.type,
				chunkMeta
			});
			if (!part && frag.gap && stats.retry) this.log(`Nothing buffered for ${frag.type} level: ${frag.level} sn: ${frag.sn} retries ${stats.retry}`);
		};
		if (buffersAppendedTo.length === 0) this.log(`Fragments must have at least one ElementaryStreamType set. ${frag.type} ${frag.level} ${part ? `part: ${part.index} of ` : ""}sn: ${frag.sn}`);
		this.blockBuffers(onUnblocked, buffersAppendedTo).catch((error) => {
			this.warn(`Fragment buffered callback ${error.message}`);
			this.stepOperationQueue(this.sourceBufferTypes);
		});
	}
	onFragChanged(event, data) {
		var _this$hls, _this$appendError;
		const config = (_this$hls = this.hls) == null ? void 0 : _this$hls.config;
		if (!config) return;
		const { backBufferLength, frontBufferFlushThreshold } = config;
		this.trimBuffers(frontBufferFlushThreshold, backBufferLength, data.frag, data.previousFrag);
		const elementaryStreams = data.frag.elementaryStreams;
		const { appendErrors } = this;
		const appendErrorType = (_this$appendError = this.appendError) == null ? void 0 : _this$appendError.sourceBufferName;
		Object.keys(elementaryStreams).forEach((type) => {
			if (!elementaryStreams[type]) return;
			appendErrors[type] = 0;
			if (type === appendErrorType) this.appendError = void 0;
			if (type === "audio" || type === "video") {
				appendErrors.audiovideo = 0;
				if (appendErrorType === "audiovideo") this.appendError = void 0;
			} else {
				appendErrors.audio = 0;
				appendErrors.video = 0;
				if (appendErrorType !== "audiovideo") this.appendError = void 0;
			}
		});
	}
	get bufferedToEnd() {
		return this.sourceBufferCount > 0 && !this.sourceBuffers.some(([type]) => {
			if (type) {
				const track = this.tracks[type];
				if (track) return !track.ended || track.ending;
			}
			return false;
		});
	}
	onBufferEos(event, data) {
		var _this$overrides;
		this.sourceBuffers.forEach(([type]) => {
			if (type) {
				const track = this.tracks[type];
				if (!data.type || data.type === type) {
					track.ending = true;
					if (!track.ended) {
						track.ended = true;
						this.log(`${type} buffer reached EOS`);
					}
				}
			}
		});
		const allowEndOfStream = ((_this$overrides = this.overrides) == null ? void 0 : _this$overrides.endOfStream) !== false;
		if (this.allTracksEnding) {
			this.unblockAudio();
			if (allowEndOfStream) {
				this.log(`Queueing EOS`);
				this.blockUntilOpen(() => {
					this.tracksEnded();
					if (!this.allTracksEnding) {
						this.log(`EOS cancelled`);
						return;
					}
					const { mediaSource } = this;
					if ((mediaSource == null ? void 0 : mediaSource.readyState) !== "open") {
						if (mediaSource) this.log(`Could not call mediaSource.endOfStream(). mediaSource.readyState: ${mediaSource.readyState}`);
						return;
					}
					this.log(`Calling mediaSource.endOfStream()`);
					mediaSource.endOfStream();
					this.hls.trigger(Events.BUFFERED_TO_END, void 0);
				});
			} else {
				this.tracksEnded();
				this.hls.trigger(Events.BUFFERED_TO_END, void 0);
			}
		} else if (data.type === "video") this.unblockAudio();
	}
	get allTracksEnding() {
		return this.sourceBufferCount > 0 && !this.sourceBuffers.some(([type]) => {
			var _this$tracks$type4;
			return type && !((_this$tracks$type4 = this.tracks[type]) != null && _this$tracks$type4.ended);
		});
	}
	tracksEnded() {
		this.sourceBuffers.forEach(([type]) => {
			if (type !== null) {
				const track = this.tracks[type];
				if (track) track.ending = false;
			}
		});
	}
	onLevelUpdated(event, { details }) {
		if (!details.fragments.length) return;
		this.details = details;
		this.updateDuration();
	}
	updateDuration() {
		this.blockUntilOpen(() => {
			const durationAndRange = this.getDurationAndRange();
			if (!durationAndRange) return;
			this.updateMediaSource(durationAndRange);
		});
	}
	onError(event, data) {
		if (data.details === ErrorDetails.BUFFER_APPEND_ERROR && data.frag) {
			var _data$errorAction;
			const nextAutoLevel = (_data$errorAction = data.errorAction) == null ? void 0 : _data$errorAction.nextAutoLevel;
			if (isFiniteNumber(nextAutoLevel) && nextAutoLevel !== data.frag.level) this.resetAppendErrors();
		}
	}
	getBackBufferEvictionTarget(type, segmentBytes, playlistType) {
		const { media } = this;
		if (!media) return 0;
		return this.fragmentTracker.getBackBufferEvictionEnd(media.currentTime, playlistType, segmentBytes);
	}
	getFragmentAppendProgress(frag) {
		var _progress;
		const key = appendProgressKey(frag);
		let progress = this.fragmentAppendProgress[key];
		if (((_progress = progress) == null ? void 0 : _progress.stats) !== frag.stats) {
			progress = {
				stats: frag.stats,
				progressed: false,
				errored: false,
				fullyBuffered: Object.create(null)
			};
			this.fragmentAppendProgress[key] = progress;
		}
		return progress;
	}
	checkAppendProgress(frag, part, chunkMeta, buffersAppendedTo) {
		if (part || !isMediaFragment(frag) || frag.gap || chunkMeta.iframe || chunkMeta.partial) return;
		const key = appendProgressKey(frag);
		const progress = this.fragmentAppendProgress[key];
		delete this.fragmentAppendProgress[key];
		const fragBuffering = frag.stats.buffering;
		if (fragBuffering.start && !fragBuffering.first) return;
		const cycle = (progress == null ? void 0 : progress.stats) === frag.stats ? progress : void 0;
		if (cycle != null && cycle.errored) return;
		const fullyBuffered = buffersAppendedTo.length > 0 && buffersAppendedTo.every((type) => (cycle == null ? void 0 : cycle.fullyBuffered[type]) === true);
		if (cycle != null && cycle.progressed || fullyBuffered) {
			delete this.appendsWithoutProgress[key];
			return;
		}
		if (!cycle && buffersAppendedTo.length === 0) return;
		const count = (this.appendsWithoutProgress[key] || 0) + 1;
		const hls = this.hls;
		if (count >= hls.config.appendErrorMaxRetry) delete this.appendsWithoutProgress[key];
		else this.appendsWithoutProgress[key] = count;
		this.warn(`Fragment ${frag.sn} of ${frag.type} playlist ${frag.level} appended ${count} time${count > 1 ? "s" : ""} without buffered range growth`);
		hls.trigger(Events.ERROR, {
			type: ErrorTypes.MEDIA_ERROR,
			details: ErrorDetails.BUFFER_APPEND_NO_PROGRESS,
			fatal: false,
			frag,
			chunkMeta,
			parent: frag.type,
			appendsWithoutProgress: count,
			error: /* @__PURE__ */ new Error(`Fragment append did not increase buffered coverage (${count})`)
		});
	}
	resetAppendProgress() {
		this.fragmentAppendProgress = Object.create(null);
		this.appendsWithoutProgress = Object.create(null);
	}
	resetAppendErrors() {
		this.appendErrors = {
			audio: 0,
			video: 0,
			audiovideo: 0
		};
		this.appendError = void 0;
	}
	trimBuffers(frontBufferFlushThreshold, backBufferLength, frag, previousFrag) {
		const { hls, details, media } = this;
		if (!media || details === null) return;
		if (!this.sourceBufferCount) return;
		const config = hls.config;
		const currentTime = media.currentTime;
		const targetDuration = details.levelTargetDuration;
		backBufferLength = details.live && config.liveBackBufferLength !== null ? config.liveBackBufferLength : backBufferLength;
		let targetBackBufferPosition = -Infinity;
		if (isFiniteNumber(backBufferLength) && backBufferLength >= 0) {
			const maxBackBufferLength = Math.max(backBufferLength, targetDuration);
			targetBackBufferPosition = Math.floor(currentTime / targetDuration) * targetDuration - maxBackBufferLength;
		}
		if (frag) {
			const loopFlushEnd = this.getLoopBackBufferFlushEnd(frag, previousFrag != null ? previousFrag : null);
			if (loopFlushEnd > 0) targetBackBufferPosition = Math.max(targetBackBufferPosition, loopFlushEnd);
		}
		if (targetBackBufferPosition > 0) this.flushBackBuffer(currentTime, targetDuration, targetBackBufferPosition);
		if (isFiniteNumber(frontBufferFlushThreshold) && frontBufferFlushThreshold > 0) {
			const frontBufferLength = Math.max(config.maxBufferLength, frontBufferFlushThreshold);
			const maxFrontBufferLength = Math.max(frontBufferLength, targetDuration);
			const targetFrontBufferPosition = Math.floor(currentTime / targetDuration) * targetDuration + maxFrontBufferLength;
			this.flushFrontBuffer(currentTime, targetDuration, targetFrontBufferPosition);
		}
	}
	/**
	* For looped media, determine the back buffer flush position to remove
	* lower-quality segments on a quality upgrade. Returns 0 if no flush is needed.
	*/
	getLoopBackBufferFlushEnd(frag, previousFrag) {
		var _this$hls2;
		const { media } = this;
		if (((_this$hls2 = this.hls) == null ? void 0 : _this$hls2.config.loopBackBufferFlush) === false || !(media != null && media.loop) || !previousFrag || frag.level <= previousFrag.level) return 0;
		const { video, audiovideo } = frag.elementaryStreams;
		if (video != null && video.partial || audiovideo != null && audiovideo.partial) return 0;
		const flushEnd = this.getEarliestElementaryStreamStart(frag) - LOOP_FLUSH_SAFETY_MARGIN;
		if (flushEnd <= 0) return 0;
		this.log(`Flushing lower quality back buffer for loop: level ${frag.level}, range [0-${flushEnd.toFixed(3)}]`);
		return flushEnd;
	}
	getEarliestElementaryStreamStart(frag) {
		const { audio, video, audiovideo } = frag.elementaryStreams;
		let earliest = frag.start;
		if (audiovideo) earliest = Math.min(earliest, audiovideo.startDTS);
		else {
			if (audio) earliest = Math.min(earliest, audio.startDTS);
			if (video) earliest = Math.min(earliest, video.startDTS);
		}
		return earliest;
	}
	flushBackBuffer(currentTime, targetDuration, targetBackBufferPosition) {
		this.sourceBuffers.forEach(([type, sb]) => {
			if (sb) {
				const buffered = BufferHelper.getBuffered(sb);
				if (buffered.length > 0 && targetBackBufferPosition > buffered.start(0)) {
					var _this$details, _this$media2, _this$hls3;
					this.hls.trigger(Events.BACK_BUFFER_REACHED, { bufferEnd: targetBackBufferPosition });
					const track = this.tracks[type];
					if ((_this$details = this.details) != null && _this$details.live) this.hls.trigger(Events.LIVE_BACK_BUFFER_REACHED, { bufferEnd: targetBackBufferPosition });
					else if (track != null && track.ended && !((_this$media2 = this.media) != null && _this$media2.loop && ((_this$hls3 = this.hls) == null ? void 0 : _this$hls3.config.loopBackBufferFlush) !== false)) {
						this.log(`Cannot flush ${type} back buffer while SourceBuffer is in ended state`);
						return;
					}
					this.hls.trigger(Events.BUFFER_FLUSHING, {
						startOffset: 0,
						endOffset: targetBackBufferPosition,
						type
					});
				}
			}
		});
	}
	flushFrontBuffer(currentTime, targetDuration, targetFrontBufferPosition) {
		this.sourceBuffers.forEach(([type, sb]) => {
			if (sb) {
				const buffered = BufferHelper.getBuffered(sb);
				const numBufferedRanges = buffered.length;
				if (numBufferedRanges < 2) return;
				const bufferStart = buffered.start(numBufferedRanges - 1);
				const bufferEnd = buffered.end(numBufferedRanges - 1);
				if (targetFrontBufferPosition > bufferStart || currentTime >= bufferStart && currentTime <= bufferEnd) return;
				this.hls.trigger(Events.BUFFER_FLUSHING, {
					startOffset: bufferStart,
					endOffset: Infinity,
					type
				});
			}
		});
	}
	/**
	* Update Media Source duration to current level duration or override to Infinity if configuration parameter
	* 'liveDurationInfinity` is set to `true`
	* More details: https://github.com/video-dev/hls.js/issues/355
	*/
	getDurationAndRange() {
		var _this$overrides2;
		const { details, mediaSource } = this;
		if (!details || !this.media || (mediaSource == null ? void 0 : mediaSource.readyState) !== "open") return null;
		const playlistEnd = details.edge;
		if (details.live && this.hls.config.liveDurationInfinity) {
			if (details.fragments.length && !!mediaSource.setLiveSeekableRange) {
				const start = Math.max(0, details.fragmentStart);
				return {
					duration: Infinity,
					start,
					end: Math.max(start, playlistEnd)
				};
			}
			return { duration: Infinity };
		}
		const overrideDuration = (_this$overrides2 = this.overrides) == null ? void 0 : _this$overrides2.duration;
		if (overrideDuration) {
			if (!isFiniteNumber(overrideDuration)) return null;
			return { duration: overrideDuration };
		}
		const mediaDuration = this.media.duration;
		if (playlistEnd > (isFiniteNumber(mediaSource.duration) ? mediaSource.duration : 0) && playlistEnd > mediaDuration || !isFiniteNumber(mediaDuration)) return { duration: playlistEnd };
		return null;
	}
	updateMediaSource({ duration, start, end }) {
		const mediaSource = this.mediaSource;
		if (!mediaSource || !this.media || mediaSource.readyState !== "open") return;
		if (mediaSource.duration !== duration) {
			if (isFiniteNumber(duration)) this.log(`Updating MediaSource duration to ${duration.toFixed(3)}`);
			mediaSource.duration = duration;
		}
		if (start !== void 0 && end !== void 0) {
			this.log(`MediaSource duration is set to ${mediaSource.duration}. Setting seekable range to ${start}-${end}.`);
			mediaSource.setLiveSeekableRange(start, end);
		}
	}
	get tracksReady() {
		const pendingTrackCount = this.pendingTrackCount;
		return pendingTrackCount > 0 && (pendingTrackCount >= this.bufferCodecEventsTotal || this.isPending(this.tracks.audiovideo));
	}
	checkPendingTracks() {
		const { bufferCodecEventsTotal, pendingTrackCount, tracks } = this;
		this.log(`checkPendingTracks (pending: ${pendingTrackCount} codec events expected: ${bufferCodecEventsTotal}) ${stringify(tracks)}`);
		if (this.tracksReady) {
			var _this$transferData4;
			const transferredTracks = (_this$transferData4 = this.transferData) == null ? void 0 : _this$transferData4.tracks;
			if (transferredTracks && Object.keys(transferredTracks).length) this.attachTransferred();
			else this.createSourceBuffers();
		}
	}
	bufferCreated() {
		if (this.sourceBufferCount) {
			const tracks = {};
			this.sourceBuffers.forEach(([type, buffer]) => {
				if (type) {
					const track = this.tracks[type];
					tracks[type] = {
						buffer,
						container: track.container,
						codec: track.codec,
						supplemental: track.supplemental,
						levelCodec: track.levelCodec,
						id: track.id,
						metadata: track.metadata
					};
				}
			});
			this.hls.trigger(Events.BUFFER_CREATED, { tracks });
			this.log(`SourceBuffers created. Running queue: ${this.operationQueue}`);
			this.sourceBuffers.forEach(([type]) => {
				this.executeNext(type);
			});
		} else {
			const error = /* @__PURE__ */ new Error("could not create source buffer for media codec(s)");
			this.hls.trigger(Events.ERROR, {
				type: ErrorTypes.MEDIA_ERROR,
				details: ErrorDetails.BUFFER_INCOMPATIBLE_CODECS_ERROR,
				fatal: true,
				error,
				reason: error.message
			});
		}
	}
	createSourceBuffers() {
		const { tracks, sourceBuffers, mediaSource } = this;
		if (!mediaSource) throw new Error("createSourceBuffers called when mediaSource was null");
		for (const trackName in tracks) {
			const type = trackName;
			const track = tracks[type];
			if (this.isPending(track)) {
				const codec = this.getTrackCodec(track, type);
				const mimeType = `${track.container};codecs=${codec}`;
				track.codec = codec;
				this.log(`creating sourceBuffer(${mimeType})${this.currentOp(type) ? " Queued" : ""} ${stringify(track)}`);
				try {
					const sb = mediaSource.addSourceBuffer(mimeType);
					const sbIndex = sourceBufferNameToIndex(type);
					sourceBuffers[sbIndex] = [type, sb];
					track.buffer = sb;
				} catch (error) {
					var _this$operationQueue;
					this.error(`error while trying to add sourceBuffer: ${error.message}`);
					this.shiftAndExecuteNext(type);
					(_this$operationQueue = this.operationQueue) == null || _this$operationQueue.removeBlockers();
					delete this.tracks[type];
					this.hls.trigger(Events.ERROR, {
						type: ErrorTypes.MEDIA_ERROR,
						details: ErrorDetails.BUFFER_ADD_CODEC_ERROR,
						fatal: false,
						error,
						sourceBufferName: type,
						mimeType,
						parent: track.id
					});
					return;
				}
				this.trackSourceBuffer(type, track);
			}
		}
		this.bufferCreated();
	}
	clearBufferAppendTimeoutId(track) {
		if (!track) return;
		self.clearTimeout(track.bufferAppendTimeoutId);
		track.bufferAppendTimeoutId = void 0;
	}
	getTrackCodec(track, trackName) {
		const supplementalCodec = track.supplemental;
		let trackCodec = track.codec;
		if (supplementalCodec && (trackName === "video" || trackName === "audiovideo") && areCodecsMediaSourceSupported(supplementalCodec, "video")) trackCodec = replaceVideoCodec(trackCodec, supplementalCodec);
		const codec = pickMostCompleteCodecName(trackCodec, track.levelCodec);
		if (codec) {
			if (trackName.slice(0, 5) === "audio") return getCodecCompatibleName(codec, this.appendSource);
			return codec;
		}
		return "";
	}
	trackSourceBuffer(type, track) {
		const buffer = track.buffer;
		if (!buffer) return;
		const codec = this.getTrackCodec(track, type);
		this.tracks[type] = {
			buffer,
			codec,
			container: track.container,
			levelCodec: track.levelCodec,
			supplemental: track.supplemental,
			metadata: track.metadata,
			id: track.id,
			listeners: []
		};
		this.removeBufferListeners(type);
		this.addBufferListener(type, "updatestart", this.onSBUpdateStart);
		this.addBufferListener(type, "updateend", this.onSBUpdateEnd);
		this.addBufferListener(type, "error", this.onSBUpdateError);
		if (this.appendSource) this.addBufferListener(type, "bufferedchange", (type, event) => {
			const removedRanges = event.removedRanges;
			if (removedRanges != null && removedRanges.length) {
				this.log(`${type} buffer removed ${timeRangesToString(removedRanges)}`);
				this.hls.trigger(Events.BUFFER_FLUSHED, {
					type,
					start: removedRanges.start(0),
					end: removedRanges.end(removedRanges.length - 1)
				});
			}
		});
	}
	get mediaSrc() {
		var _media$querySelector;
		const media = this.media;
		if (!media) return;
		return (media.src ? media : ((_media$querySelector = media.querySelector) == null ? void 0 : _media$querySelector.call(media, "source")) || media).src;
	}
	isMediaSourceReplaced(objectUrl = this._objectUrl) {
		var _this$media3;
		if (!objectUrl) return false;
		const currentSrc = (_this$media3 = this.media) == null ? void 0 : _this$media3.currentSrc;
		const mediaSrc = this.mediaSrc;
		return !!currentSrc && currentSrc !== objectUrl || !!mediaSrc && mediaSrc !== objectUrl;
	}
	onSBUpdateStart(type) {
		const operation = this.currentOp(type);
		if (!operation) return;
		operation.onStart();
	}
	onSBUpdateEnd(type) {
		var _this$mediaSource5, _this$tracks$type5;
		if (((_this$mediaSource5 = this.mediaSource) == null ? void 0 : _this$mediaSource5.readyState) === "closed") {
			this.resetBuffer(type);
			return;
		}
		const operation = this.currentOp(type);
		if (!operation) return;
		operation.onComplete();
		if ((_this$tracks$type5 = this.tracks[type]) == null || (_this$tracks$type5 = _this$tracks$type5.buffer) == null ? void 0 : _this$tracks$type5.updating) {
			this.log(`${type} SourceBuffer updating on "updateend"`);
			this.blockUntilOpen(() => {
				this.shiftAndExecuteNext(type);
			});
			return;
		}
		this.shiftAndExecuteNext(type);
	}
	onSBUpdateError(type, event) {
		var _this$mediaSource6;
		const readyState = (_this$mediaSource6 = this.mediaSource) == null ? void 0 : _this$mediaSource6.readyState;
		const error = /* @__PURE__ */ new Error(`${type} SourceBuffer error. MediaSource readyState: ${readyState}`);
		error.name = SOURCE_BUFFER_ERROR_NAME;
		this.error(`${error.message}`, event);
		this.hls.trigger(Events.ERROR, {
			type: ErrorTypes.MEDIA_ERROR,
			details: ErrorDetails.BUFFER_APPENDING_ERROR,
			sourceBufferName: type,
			error,
			fatal: false
		});
		const operation = this.currentOp(type);
		if (operation) operation.onError(error);
	}
	updateTimestampOffset(sb, timestampOffset, tolerance, type, sn, cc) {
		const delta = timestampOffset - sb.timestampOffset;
		if (Math.abs(delta) >= tolerance) {
			this.log(`Updating ${type} SourceBuffer timestampOffset to ${timestampOffset} (sn: ${sn} cc: ${cc})`);
			sb.timestampOffset = timestampOffset;
		}
	}
	removeExecutor(type, startOffset, endOffset) {
		const { media, mediaSource } = this;
		const track = this.tracks[type];
		const sb = track == null ? void 0 : track.buffer;
		if (!media || !mediaSource || !sb) throw new Error(`Attempting to remove from the ${type} SourceBuffer, but it does not exist`);
		const mediaDuration = isFiniteNumber(media.duration) ? media.duration : Infinity;
		const msDuration = isFiniteNumber(mediaSource.duration) ? mediaSource.duration : Infinity;
		const removeStart = Math.max(0, startOffset);
		if (removeStart >= msDuration) {
			var _this$currentOp;
			(_this$currentOp = this.currentOp(type)) == null || _this$currentOp.onComplete();
			this.shiftAndExecuteNext(type);
			return;
		}
		const removeEnd = Math.min(endOffset, mediaDuration, msDuration);
		if (removeEnd > removeStart && (!track.ending || track.ended)) {
			track.ended = false;
			this.log(`Removing [${removeStart},${removeEnd}] from the ${type} SourceBuffer`);
			sb.remove(removeStart, removeEnd);
		} else throw new Error(`Cannot remove ${removeEnd <= removeStart ? `invalid range (${removeStart} >= ${removeEnd}) ` : ""}from the ${type} SourceBuffer${track.ending ? " while track ending" : ""}`);
	}
	appendExecutor(data, type) {
		const track = this.tracks[type];
		const sb = track == null ? void 0 : track.buffer;
		if (!sb) throw new HlsJsTrackRemovedError(`Attempting to append to the ${type} SourceBuffer, but it does not exist`);
		track.ending = false;
		track.ended = false;
		if (this.hls.config.appendTimeout !== Infinity) {
			const appendTimeoutTime = this.calculateAppendTimeoutTime(sb);
			track.bufferAppendTimeoutId = self.setTimeout(() => this.appendTimeoutHandler(type, sb, appendTimeoutTime), appendTimeoutTime);
		}
		sb.appendBuffer(data);
	}
	appendTimeoutHandler(type, sb, appendTimeoutTime) {
		this.log(`Received timeout after ${appendTimeoutTime}ms for append on ${type} source buffer. Aborting and triggering error.`);
		try {
			sb.abort();
		} catch (e) {
			this.log(`Failed to abort append on ${type} source buffer after timeout.`);
		}
		const operation = this.currentOp(type);
		if (operation) operation.onError(/* @__PURE__ */ new Error(`${type}-append-timeout`));
	}
	calculateAppendTimeoutTime(sb) {
		let targetDuration = DEFAULT_TARGET_DURATION;
		if (this.details) targetDuration = this.details.levelTargetDuration;
		let desiredDefaultTimeoutValue = 2 * targetDuration * 1e3;
		if (this.media === null) return desiredDefaultTimeoutValue;
		const activeBufferedRange = BufferHelper.bufferInfo(sb, this.media.currentTime, 0);
		if (!activeBufferedRange.len) return desiredDefaultTimeoutValue;
		desiredDefaultTimeoutValue = Math.max(activeBufferedRange.len * 1e3, desiredDefaultTimeoutValue);
		return Math.max(this.hls.config.appendTimeout, desiredDefaultTimeoutValue);
	}
	blockUntilOpen(callback) {
		if (this.isUpdating() || this.isQueued()) this.blockBuffers(callback).catch((error) => {
			this.warn(`SourceBuffer blocked callback ${error}`);
			this.stepOperationQueue(this.sourceBufferTypes);
		});
		else try {
			callback();
		} catch (error) {
			this.warn(`Callback run without blocking ${this.operationQueue} ${error}`);
		}
	}
	isUpdating() {
		return this.sourceBuffers.some(([type, sb]) => type && sb.updating);
	}
	isQueued() {
		return this.sourceBuffers.some(([type]) => type && !!this.currentOp(type));
	}
	isPending(track) {
		return !!track && !track.buffer;
	}
	isAudioBlocked() {
		var _this$currentOp2;
		return ((_this$currentOp2 = this.currentOp("audio")) == null ? void 0 : _this$currentOp2.label) === "block-audio";
	}
	isAudioBlocking() {
		if (this.operationQueue) return this.operationQueue.audioBlocking();
		return false;
	}
	blockBuffers(onUnblocked, bufferNames = this.sourceBufferTypes) {
		if (!bufferNames.length) {
			this.log("Blocking operation requested, but no SourceBuffers exist");
			return Promise.resolve().then(onUnblocked);
		}
		const { operationQueue } = this;
		const blockingOperations = bufferNames.length === 2 && this.isAudioBlocking() ? [this.appendBlocker("video")] : bufferNames.map((type) => this.appendBlocker(type));
		return Promise.all(blockingOperations).then((result) => {
			if (operationQueue !== this.operationQueue) return;
			onUnblocked();
			this.stepOperationQueue(this.sourceBufferTypes);
		});
	}
	stepOperationQueue(bufferNames) {
		bufferNames.forEach((type) => {
			var _this$tracks$type6;
			const sb = (_this$tracks$type6 = this.tracks[type]) == null ? void 0 : _this$tracks$type6.buffer;
			if (!sb || sb.updating || type === "audio" && this.isAudioBlocked()) return;
			this.shiftAndExecuteNext(type);
		});
	}
	append(operation, type, pending) {
		if (this.operationQueue) this.operationQueue.append(operation, type, pending);
	}
	insertNext(operations, type) {
		if (this.operationQueue) this.operationQueue.insertNext(operations, type);
	}
	appendBlocker(type) {
		if (this.operationQueue) return this.operationQueue.appendBlocker(type);
	}
	currentOp(type) {
		if (this.operationQueue) return this.operationQueue.current(type);
		return null;
	}
	executeNext(type) {
		if (type && this.operationQueue) this.operationQueue.executeNext(type);
	}
	shiftAndExecuteNext(type) {
		if (this.operationQueue) this.operationQueue.shiftAndExecuteNext(type);
	}
	get pendingTrackCount() {
		return Object.keys(this.tracks).reduce((acc, type) => acc + (this.isPending(this.tracks[type]) ? 1 : 0), 0);
	}
	get sourceBufferCount() {
		return this.sourceBuffers.reduce((acc, [type]) => acc + (type ? 1 : 0), 0);
	}
	get sourceBufferTypes() {
		return this.sourceBuffers.map(([type]) => type).filter((type) => !!type);
	}
	addBufferListener(type, event, fn) {
		const track = this.tracks[type];
		if (!track) return;
		const buffer = track.buffer;
		if (!buffer) return;
		const listener = fn.bind(this, type);
		track.listeners.push({
			event,
			listener
		});
		addEventListener(buffer, event, listener);
	}
	removeBufferListeners(type) {
		const track = this.tracks[type];
		if (!track) return;
		const buffer = track.buffer;
		if (!buffer) return;
		track.listeners.forEach((l) => {
			removeEventListener(buffer, l.event, l.listener);
		});
		track.listeners.length = 0;
	}
};
function removeSourceChildren(node) {
	const sourceChildren = node.querySelectorAll("source");
	[].slice.call(sourceChildren).forEach((source) => {
		node.removeChild(source);
	});
}
function addSource(media, url) {
	const source = self.document.createElement("source");
	source.type = "video/mp4";
	source.src = url;
	media.appendChild(source);
}
function sourceBufferNameToIndex(type) {
	return type === "audio" ? 1 : 0;
}
function mediaErrorRecoveryMessage(fatal, mediaError) {
	return `${fatal ? "" : " - triggering recovery"}${mediaError ? " with HTMLMediaElement Error: " + mediaError.message : ""}`;
}
function appendProgressKey(fragment) {
	return `${fragment.type}_${fragment.sn}_${fragment.level}`;
}
function fragmentBufferedCoverage(timeRanges, fragment) {
	const { start, end } = fragment;
	let coverage = 0;
	for (let i = 0; i < timeRanges.length; i++) {
		const timeRange = timeRanges[i];
		if (timeRange.start >= end) break;
		const rangeStart = Math.max(start, timeRange.start);
		const rangeEnd = Math.min(end, timeRange.end);
		if (rangeEnd > rangeStart) coverage += rangeEnd - rangeStart;
	}
	return coverage;
}
function isFragmentFullyBuffered(coverage, fragment) {
	return fragment.duration - coverage <= .05;
}
var FragmentState = {
	NOT_LOADED: "NOT_LOADED",
	APPENDING: "APPENDING",
	PARTIAL: "PARTIAL",
	OK: "OK"
};
var FragmentTracker = class {
	constructor(hls) {
		this.activePartLists = Object.create(null);
		this.endListFragments = Object.create(null);
		this.fragments = Object.create(null);
		this.timeRanges = Object.create(null);
		this.bufferPadding = .2;
		this.hls = void 0;
		this.hasGaps = false;
		this.hls = hls;
		this._registerListeners();
	}
	_registerListeners() {
		const { hls } = this;
		if (hls) {
			hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
			hls.on(Events.BUFFER_APPENDED, this.onBufferAppended, this);
			hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
			hls.on(Events.FRAG_LOADED, this.onFragLoaded, this);
		}
	}
	_unregisterListeners() {
		const { hls } = this;
		if (hls) {
			hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
			hls.off(Events.BUFFER_APPENDED, this.onBufferAppended, this);
			hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
			hls.off(Events.FRAG_LOADED, this.onFragLoaded, this);
		}
	}
	destroy() {
		this._unregisterListeners();
		this.hls = this.fragments = this.activePartLists = this.endListFragments = this.timeRanges = null;
	}
	/**
	* Return a Fragment or Part with an appended range that matches the position and levelType
	* Otherwise, return null
	*/
	getAppendedFrag(position, levelType) {
		const activeParts = this.activePartLists[levelType];
		if (activeParts) for (let i = activeParts.length; i--;) {
			const activePart = activeParts[i];
			if (!activePart) break;
			if (activePart.start <= position && position <= activePart.end && activePart.loaded) return activePart;
		}
		return this.getBufferedFrag(position, levelType);
	}
	/**
	* Return a buffered Fragment that matches the position and levelType.
	* A buffered Fragment is one whose loading, parsing and appending is done (completed or "partial" meaning aborted).
	* If not found any Fragment, return null
	*/
	getBufferedFrag(position, levelType) {
		return this.getFragAtPos(position, levelType, true);
	}
	getFragAtPos(position, levelType, buffered) {
		const { fragments } = this;
		const keys = Object.keys(fragments);
		for (let i = keys.length; i--;) {
			const fragmentEntity = fragments[keys[i]];
			if ((fragmentEntity == null ? void 0 : fragmentEntity.body.type) === levelType && (!buffered || fragmentEntity.buffered)) {
				const frag = fragmentEntity.body;
				if (frag.start <= position && position <= frag.end) return frag;
			}
		}
		return null;
	}
	/**
	* Partial fragments effected by coded frame eviction will be removed
	* The browser will unload parts of the buffer to free up memory for new buffer data
	* Fragments will need to be reloaded when the buffer is freed up, removing partial fragments will allow them to reload(since there might be parts that are still playable)
	*/
	detectEvictedFragments(elementaryStream, timeRange, playlistType, appendedFrag, appendedPart, removeAppending) {
		if (this.timeRanges) this.timeRanges[elementaryStream] = timeRange;
		const appendedPartSn = (appendedPart == null ? void 0 : appendedPart.fragment.sn) || -1;
		Object.keys(this.fragments).forEach((key) => {
			const fragmentEntity = this.fragments[key];
			if (!fragmentEntity || !this.hls) return;
			const frag = fragmentEntity.body;
			if (appendedPartSn >= frag.sn) return;
			if (!fragmentEntity.buffered && (!fragmentEntity.loaded || removeAppending)) {
				if (frag.type === playlistType) this.removeFragment(frag);
				return;
			}
			const esData = fragmentEntity.range[elementaryStream];
			if (!esData) return;
			if (esData.time.length === 0) {
				this.removeFragment(frag);
				return;
			}
			esData.time.some((time) => {
				const isNotBuffered = !this.isTimeBuffered(time.startPTS, time.endPTS, timeRange);
				if (isNotBuffered) this.removeFragment(frag);
				return isNotBuffered;
			});
			if (appendedFrag && appendedFrag !== frag && userAgentChromeVersion()) {
				const endPTS = appendedFrag.endPTS;
				const otherStartPTS = frag.startPTS;
				if (endPTS && otherStartPTS && fragmentEntity.range.video) {
					const diff = otherStartPTS - endPTS;
					if (diff < 0 && diff > -.1) {
						this.removeFragment(frag);
						this.hls.trigger(Events.BUFFER_FLUSHING, {
							startOffset: endPTS + .004,
							endOffset: Infinity,
							type: "video"
						});
					}
				}
			}
		});
	}
	/**
	* Checks if the fragment passed in is loaded in the buffer properly
	* Partially loaded fragments will be registered as a partial fragment
	*/
	detectPartialFragments(data) {
		const timeRanges = this.timeRanges;
		const { frag, part, id: playlistType } = data;
		if (!timeRanges || !isMediaFragment(frag)) return;
		const fragKey = getFragmentKey(frag);
		const fragmentEntity = this.fragments[fragKey];
		if (!fragmentEntity || fragmentEntity.buffered && frag.gap) return;
		const isFragHint = !frag.relurl;
		Object.keys(timeRanges).forEach((elementaryStream) => {
			const streamInfo = frag.elementaryStreams[elementaryStream];
			if (!streamInfo) return;
			const timeRange = timeRanges[elementaryStream];
			const partial = isFragHint || streamInfo.partial === true;
			fragmentEntity.range[elementaryStream] = this.getBufferedTimes(frag, part, partial, timeRange);
			this.detectEvictedFragments(elementaryStream, timeRange, playlistType, frag, part);
		});
		fragmentEntity.loaded = null;
		const trackNames = Object.keys(fragmentEntity.range);
		if (trackNames.length) {
			this.bufferedEnd(fragmentEntity, frag);
			if (!isPartial(fragmentEntity)) this.removeParts(frag.sn - 1, frag.type);
			if (!part) {
				const minPartialAppend = Math.min(.004, frag.duration);
				trackNames.some((elementaryStream) => {
					var _fragmentEntity$range;
					const times = (_fragmentEntity$range = fragmentEntity.range[elementaryStream]) == null ? void 0 : _fragmentEntity$range.time;
					const bufferedGap = times.length === 0 || times.length === 1 && times[0].endPTS - times[0].startPTS < minPartialAppend;
					if (bufferedGap) this.addAsGap(frag);
					return bufferedGap;
				});
			}
		} else this.removeFragment(frag);
	}
	addAsGap(frag) {
		frag.gap = true;
		this.removeFragment(frag);
		this.fragBuffered(frag, true);
	}
	bufferedEnd(fragmentEntity, frag) {
		fragmentEntity.buffered = true;
		if ((fragmentEntity.body.endList = frag.endList || fragmentEntity.body.endList) && !frag.gap) this.endListFragments[fragmentEntity.body.type] = fragmentEntity;
	}
	removeParts(snToKeep, levelType) {
		const activeParts = this.activePartLists[levelType];
		if (!activeParts) return;
		this.activePartLists[levelType] = filterParts(activeParts, (part) => part.fragment.sn >= snToKeep);
	}
	fragBuffered(frag, force) {
		const fragKey = getFragmentKey(frag);
		let fragmentEntity = this.fragments[fragKey];
		if (!fragmentEntity && force) {
			fragmentEntity = this.fragments[fragKey] = {
				body: frag,
				appendedPTS: null,
				loaded: null,
				buffered: false,
				range: Object.create(null)
			};
			if (frag.gap) this.hasGaps = true;
		}
		if (fragmentEntity) {
			fragmentEntity.loaded = null;
			this.bufferedEnd(fragmentEntity, frag);
		}
		return fragmentEntity;
	}
	getBufferedTimes(fragment, part, partial, timeRange) {
		const buffered = {
			time: [],
			partial
		};
		const startPTS = fragment.start;
		const endPTS = fragment.end;
		const minEndPTS = fragment.minEndPTS || endPTS;
		const maxStartPTS = fragment.maxStartPTS || startPTS;
		for (let i = 0; i < timeRange.length; i++) {
			const startTime = timeRange.start(i) - this.bufferPadding;
			const endTime = timeRange.end(i) + this.bufferPadding;
			if (maxStartPTS >= startTime && minEndPTS <= endTime) {
				buffered.time.push({
					startPTS: Math.max(startPTS, timeRange.start(i)),
					endPTS: Math.min(endPTS, timeRange.end(i))
				});
				break;
			} else if (startPTS < endTime && endPTS > startTime) {
				const start = Math.max(startPTS, timeRange.start(i));
				const end = Math.min(endPTS, timeRange.end(i));
				if (end > start) {
					buffered.partial = true;
					buffered.time.push({
						startPTS: start,
						endPTS: end
					});
				}
			} else if (endPTS <= startTime) break;
		}
		return buffered;
	}
	/**
	* Gets the partial fragment for a certain time
	*/
	getPartialFragment(time) {
		let bestFragment = null;
		let timePadding;
		let startTime;
		let endTime;
		let bestOverlap = 0;
		const { bufferPadding, fragments } = this;
		Object.keys(fragments).forEach((key) => {
			const fragmentEntity = fragments[key];
			if (!fragmentEntity) return;
			if (isPartial(fragmentEntity)) {
				startTime = fragmentEntity.body.start - bufferPadding;
				endTime = fragmentEntity.body.end + bufferPadding;
				if (time >= startTime && time <= endTime) {
					timePadding = Math.min(time - startTime, endTime - time);
					if (bestOverlap <= timePadding) {
						bestFragment = fragmentEntity.body;
						bestOverlap = timePadding;
					}
				}
			}
		});
		return bestFragment;
	}
	isEndListAppended(type) {
		const lastFragmentEntity = this.endListFragments[type];
		return lastFragmentEntity !== void 0 && (lastFragmentEntity.buffered || isPartial(lastFragmentEntity));
	}
	getState(fragment) {
		const fragKey = getFragmentKey(fragment);
		const fragmentEntity = this.fragments[fragKey];
		if (fragmentEntity) {
			if (!fragmentEntity.buffered) return FragmentState.APPENDING;
			else if (isPartial(fragmentEntity)) return FragmentState.PARTIAL;
			else return FragmentState.OK;
		}
		return FragmentState.NOT_LOADED;
	}
	isTimeBuffered(startPTS, endPTS, timeRange) {
		let startTime;
		let endTime;
		for (let i = 0; i < timeRange.length; i++) {
			startTime = timeRange.start(i) - this.bufferPadding;
			endTime = timeRange.end(i) + this.bufferPadding;
			if (startPTS >= startTime && endPTS <= endTime) return true;
			if (endPTS <= startTime) return false;
		}
		return false;
	}
	onManifestLoading() {
		this.removeAllFragments();
	}
	onFragLoaded(event, data) {
		if (!isMediaFragment(data.frag) || data.frag.bitrateTest) return;
		const frag = data.frag;
		const loaded = data.part ? null : data;
		const fragKey = getFragmentKey(frag);
		this.fragments[fragKey] = {
			body: frag,
			appendedPTS: null,
			loaded,
			buffered: false,
			range: Object.create(null)
		};
	}
	onBufferAppended(event, data) {
		const { frag, part, timeRanges } = data;
		if (!isMediaFragment(frag)) return;
		const playlistType = frag.type;
		if (part) {
			let activeParts = this.activePartLists[playlistType];
			if (!activeParts) this.activePartLists[playlistType] = activeParts = [];
			activeParts.push(part);
		}
		this.timeRanges = timeRanges;
	}
	onFragBuffered(event, data) {
		this.detectPartialFragments(data);
	}
	hasFragment(fragment) {
		const fragKey = getFragmentKey(fragment);
		return !!this.fragments[fragKey];
	}
	hasFragments(type) {
		const { fragments } = this;
		const keys = Object.keys(fragments);
		if (!type) return keys.length > 0;
		for (let i = keys.length; i--;) {
			const fragmentEntity = fragments[keys[i]];
			if ((fragmentEntity == null ? void 0 : fragmentEntity.body.type) === type) return true;
		}
		return false;
	}
	hasParts(type) {
		var _this$activePartLists;
		return !!((_this$activePartLists = this.activePartLists[type]) != null && _this$activePartLists.length);
	}
	/**
	* Returns the end position needed to free at least `bytesNeeded` from the
	* back buffer, or 0 if not enough data is available. Walks buffered
	* fragments in key order, accumulating byte sizes using stats.loaded,
	* byteLength, or a bitrate estimate as fallback.
	*/
	getBackBufferEvictionEnd(beforePosition, levelType, bytesNeeded) {
		const { fragments } = this;
		let bytesFreed = 0;
		let evictEnd = 0;
		const keys = Object.keys(fragments);
		for (let i = 0; i < keys.length; i++) {
			const entity = fragments[keys[i]];
			if (!entity || !entity.buffered || entity.body.type !== levelType) continue;
			const frag = entity.body;
			if (frag.gap) return 0;
			const bytes = frag.hasStats && frag.stats.loaded || frag.byteLength || frag.bitrate && frag.bitrate * 8 * frag.duration;
			if (frag.end <= beforePosition && bytes) {
				bytesFreed += bytes;
				evictEnd = Math.max(evictEnd, frag.end);
				if (bytesFreed >= bytesNeeded) return evictEnd;
			}
		}
		return evictEnd > 0 ? evictEnd : 0;
	}
	removeFragmentsInRange(start, end, playlistType, withGapOnly, unbufferedOnly) {
		if (withGapOnly && !this.hasGaps) return;
		Object.keys(this.fragments).forEach((key) => {
			const fragmentEntity = this.fragments[key];
			if (!fragmentEntity) return;
			const frag = fragmentEntity.body;
			if (frag.type !== playlistType || withGapOnly && !frag.gap) return;
			if (frag.start < end && frag.end > start && (fragmentEntity.buffered || unbufferedOnly)) this.removeFragment(frag);
		});
	}
	removeFragment(fragment) {
		const fragKey = getFragmentKey(fragment);
		fragment.clearElementaryStreamInfo();
		const activeParts = this.activePartLists[fragment.type];
		if (activeParts) {
			const snToRemove = fragment.sn;
			this.activePartLists[fragment.type] = filterParts(activeParts, (part) => part.fragment.sn !== snToRemove);
		}
		delete this.fragments[fragKey];
		if (fragment.endList) delete this.endListFragments[fragment.type];
	}
	/** Tracked fragments marked as gaps */
	gapFragments() {
		if (!this.hasGaps) return [];
		return Object.keys(this.fragments).map((key) => {
			var _this$fragments$key;
			return (_this$fragments$key = this.fragments[key]) == null ? void 0 : _this$fragments$key.body;
		}).filter((frag) => !!(frag != null && frag.gap));
	}
	removeAllFragments() {
		var _this$hls;
		this.fragments = Object.create(null);
		this.endListFragments = Object.create(null);
		this.activePartLists = Object.create(null);
		this.hasGaps = false;
		const partlist = (_this$hls = this.hls) == null || (_this$hls = _this$hls.latestLevelDetails) == null ? void 0 : _this$hls.partList;
		if (partlist) partlist.forEach((part) => part.clearElementaryStreamInfo());
	}
};
function isPartial(fragmentEntity) {
	var _fragmentEntity$range2, _fragmentEntity$range3, _fragmentEntity$range4, _fragmentEntity$range5;
	return fragmentEntity.buffered && !!(fragmentEntity.body.gap || (_fragmentEntity$range2 = fragmentEntity.range.video) != null && _fragmentEntity$range2.partial || (_fragmentEntity$range3 = fragmentEntity.range.audio) != null && _fragmentEntity$range3.partial || (_fragmentEntity$range4 = fragmentEntity.range.audiovideo) != null && _fragmentEntity$range4.partial || (_fragmentEntity$range5 = fragmentEntity.range.subs) != null && _fragmentEntity$range5.partial);
}
function getFragmentKey(fragment) {
	return `${fragment.type}_${fragment.level}_${fragment.sn}`;
}
function filterParts(partList, predicate) {
	return partList.filter((part) => {
		const keep = predicate(part);
		if (!keep) part.clearElementaryStreamInfo();
		return keep;
	});
}
var AESCrypto = class {
	constructor(subtle, iv, aesMode) {
		this.subtle = void 0;
		this.aesIV = void 0;
		this.aesMode = void 0;
		this.subtle = subtle;
		this.aesIV = iv;
		this.aesMode = aesMode;
	}
	decrypt(data, key) {
		switch (this.aesMode) {
			case DecrypterAesMode.cbc: return this.subtle.decrypt({
				name: "AES-CBC",
				iv: this.aesIV
			}, key, data);
			case DecrypterAesMode.ctr: return this.subtle.decrypt({
				name: "AES-CTR",
				counter: this.aesIV,
				length: 64
			}, key, data);
			default: throw new Error(`[AESCrypto] invalid aes mode ${this.aesMode}`);
		}
	}
};
function removePadding(array) {
	const outputBytes = array.byteLength;
	const paddingBytes = outputBytes && new DataView(array.buffer).getUint8(outputBytes - 1);
	if (paddingBytes) return array.slice(0, outputBytes - paddingBytes);
	return array;
}
var AESDecryptor = class {
	constructor() {
		this.rcon = [
			0,
			1,
			2,
			4,
			8,
			16,
			32,
			64,
			128,
			27,
			54
		];
		this.subMix = [
			/* @__PURE__ */ new Uint32Array(256),
			/* @__PURE__ */ new Uint32Array(256),
			/* @__PURE__ */ new Uint32Array(256),
			/* @__PURE__ */ new Uint32Array(256)
		];
		this.invSubMix = [
			/* @__PURE__ */ new Uint32Array(256),
			/* @__PURE__ */ new Uint32Array(256),
			/* @__PURE__ */ new Uint32Array(256),
			/* @__PURE__ */ new Uint32Array(256)
		];
		this.sBox = /* @__PURE__ */ new Uint32Array(256);
		this.invSBox = /* @__PURE__ */ new Uint32Array(256);
		this.key = /* @__PURE__ */ new Uint32Array(0);
		this.ksRows = 0;
		this.keySize = 0;
		this.keySchedule = void 0;
		this.invKeySchedule = void 0;
		this.initTable();
	}
	uint8ArrayToUint32Array_(arrayBuffer) {
		const view = new DataView(arrayBuffer);
		const newArray = /* @__PURE__ */ new Uint32Array(4);
		for (let i = 0; i < 4; i++) newArray[i] = view.getUint32(i * 4);
		return newArray;
	}
	initTable() {
		const sBox = this.sBox;
		const invSBox = this.invSBox;
		const subMix = this.subMix;
		const subMix0 = subMix[0];
		const subMix1 = subMix[1];
		const subMix2 = subMix[2];
		const subMix3 = subMix[3];
		const invSubMix = this.invSubMix;
		const invSubMix0 = invSubMix[0];
		const invSubMix1 = invSubMix[1];
		const invSubMix2 = invSubMix[2];
		const invSubMix3 = invSubMix[3];
		const d = /* @__PURE__ */ new Uint32Array(256);
		let x = 0;
		let xi = 0;
		let i = 0;
		for (i = 0; i < 256; i++) if (i < 128) d[i] = i << 1;
		else d[i] = i << 1 ^ 283;
		for (i = 0; i < 256; i++) {
			let sx = xi ^ xi << 1 ^ xi << 2 ^ xi << 3 ^ xi << 4;
			sx = sx >>> 8 ^ sx & 255 ^ 99;
			sBox[x] = sx;
			invSBox[sx] = x;
			const x2 = d[x];
			const x4 = d[x2];
			const x8 = d[x4];
			let t = d[sx] * 257 ^ sx * 16843008;
			subMix0[x] = t << 24 | t >>> 8;
			subMix1[x] = t << 16 | t >>> 16;
			subMix2[x] = t << 8 | t >>> 24;
			subMix3[x] = t;
			t = x8 * 16843009 ^ x4 * 65537 ^ x2 * 257 ^ x * 16843008;
			invSubMix0[sx] = t << 24 | t >>> 8;
			invSubMix1[sx] = t << 16 | t >>> 16;
			invSubMix2[sx] = t << 8 | t >>> 24;
			invSubMix3[sx] = t;
			if (!x) x = xi = 1;
			else {
				x = x2 ^ d[d[d[x8 ^ x2]]];
				xi ^= d[d[xi]];
			}
		}
	}
	expandKey(keyBuffer) {
		const key = this.uint8ArrayToUint32Array_(keyBuffer);
		let sameKey = true;
		let offset = 0;
		while (offset < key.length && sameKey) {
			sameKey = key[offset] === this.key[offset];
			offset++;
		}
		if (sameKey) return;
		this.key = key;
		const keySize = this.keySize = key.length;
		if (keySize !== 4 && keySize !== 6 && keySize !== 8) throw new Error("Invalid aes key size=" + keySize);
		const ksRows = this.ksRows = (keySize + 6 + 1) * 4;
		let ksRow;
		let invKsRow;
		const keySchedule = this.keySchedule = new Uint32Array(ksRows);
		const invKeySchedule = this.invKeySchedule = new Uint32Array(ksRows);
		const sbox = this.sBox;
		const rcon = this.rcon;
		const invSubMix = this.invSubMix;
		const invSubMix0 = invSubMix[0];
		const invSubMix1 = invSubMix[1];
		const invSubMix2 = invSubMix[2];
		const invSubMix3 = invSubMix[3];
		let prev;
		let t;
		for (ksRow = 0; ksRow < ksRows; ksRow++) {
			if (ksRow < keySize) {
				prev = keySchedule[ksRow] = key[ksRow];
				continue;
			}
			t = prev;
			if (ksRow % keySize === 0) {
				t = t << 8 | t >>> 24;
				t = sbox[t >>> 24] << 24 | sbox[t >>> 16 & 255] << 16 | sbox[t >>> 8 & 255] << 8 | sbox[t & 255];
				t ^= rcon[ksRow / keySize | 0] << 24;
			} else if (keySize > 6 && ksRow % keySize === 4) t = sbox[t >>> 24] << 24 | sbox[t >>> 16 & 255] << 16 | sbox[t >>> 8 & 255] << 8 | sbox[t & 255];
			keySchedule[ksRow] = prev = (keySchedule[ksRow - keySize] ^ t) >>> 0;
		}
		for (invKsRow = 0; invKsRow < ksRows; invKsRow++) {
			ksRow = ksRows - invKsRow;
			if (invKsRow & 3) t = keySchedule[ksRow];
			else t = keySchedule[ksRow - 4];
			if (invKsRow < 4 || ksRow <= 4) invKeySchedule[invKsRow] = t;
			else invKeySchedule[invKsRow] = invSubMix0[sbox[t >>> 24]] ^ invSubMix1[sbox[t >>> 16 & 255]] ^ invSubMix2[sbox[t >>> 8 & 255]] ^ invSubMix3[sbox[t & 255]];
			invKeySchedule[invKsRow] = invKeySchedule[invKsRow] >>> 0;
		}
	}
	networkToHostOrderSwap(word) {
		return word << 24 | (word & 65280) << 8 | (word & 16711680) >> 8 | word >>> 24;
	}
	decrypt(inputArrayBuffer, offset, aesIV) {
		const nRounds = this.keySize + 6;
		const invKeySchedule = this.invKeySchedule;
		const invSBOX = this.invSBox;
		const invSubMix = this.invSubMix;
		const invSubMix0 = invSubMix[0];
		const invSubMix1 = invSubMix[1];
		const invSubMix2 = invSubMix[2];
		const invSubMix3 = invSubMix[3];
		const initVector = this.uint8ArrayToUint32Array_(aesIV);
		let initVector0 = initVector[0];
		let initVector1 = initVector[1];
		let initVector2 = initVector[2];
		let initVector3 = initVector[3];
		const inputInt32 = new Int32Array(inputArrayBuffer);
		const outputInt32 = new Int32Array(inputInt32.length);
		let t0, t1, t2, t3;
		let s0, s1, s2, s3;
		let inputWords0, inputWords1, inputWords2, inputWords3;
		let ksRow, i;
		const swapWord = this.networkToHostOrderSwap;
		while (offset < inputInt32.length) {
			inputWords0 = swapWord(inputInt32[offset]);
			inputWords1 = swapWord(inputInt32[offset + 1]);
			inputWords2 = swapWord(inputInt32[offset + 2]);
			inputWords3 = swapWord(inputInt32[offset + 3]);
			s0 = inputWords0 ^ invKeySchedule[0];
			s1 = inputWords3 ^ invKeySchedule[1];
			s2 = inputWords2 ^ invKeySchedule[2];
			s3 = inputWords1 ^ invKeySchedule[3];
			ksRow = 4;
			for (i = 1; i < nRounds; i++) {
				t0 = invSubMix0[s0 >>> 24] ^ invSubMix1[s1 >> 16 & 255] ^ invSubMix2[s2 >> 8 & 255] ^ invSubMix3[s3 & 255] ^ invKeySchedule[ksRow];
				t1 = invSubMix0[s1 >>> 24] ^ invSubMix1[s2 >> 16 & 255] ^ invSubMix2[s3 >> 8 & 255] ^ invSubMix3[s0 & 255] ^ invKeySchedule[ksRow + 1];
				t2 = invSubMix0[s2 >>> 24] ^ invSubMix1[s3 >> 16 & 255] ^ invSubMix2[s0 >> 8 & 255] ^ invSubMix3[s1 & 255] ^ invKeySchedule[ksRow + 2];
				t3 = invSubMix0[s3 >>> 24] ^ invSubMix1[s0 >> 16 & 255] ^ invSubMix2[s1 >> 8 & 255] ^ invSubMix3[s2 & 255] ^ invKeySchedule[ksRow + 3];
				s0 = t0;
				s1 = t1;
				s2 = t2;
				s3 = t3;
				ksRow = ksRow + 4;
			}
			t0 = invSBOX[s0 >>> 24] << 24 ^ invSBOX[s1 >> 16 & 255] << 16 ^ invSBOX[s2 >> 8 & 255] << 8 ^ invSBOX[s3 & 255] ^ invKeySchedule[ksRow];
			t1 = invSBOX[s1 >>> 24] << 24 ^ invSBOX[s2 >> 16 & 255] << 16 ^ invSBOX[s3 >> 8 & 255] << 8 ^ invSBOX[s0 & 255] ^ invKeySchedule[ksRow + 1];
			t2 = invSBOX[s2 >>> 24] << 24 ^ invSBOX[s3 >> 16 & 255] << 16 ^ invSBOX[s0 >> 8 & 255] << 8 ^ invSBOX[s1 & 255] ^ invKeySchedule[ksRow + 2];
			t3 = invSBOX[s3 >>> 24] << 24 ^ invSBOX[s0 >> 16 & 255] << 16 ^ invSBOX[s1 >> 8 & 255] << 8 ^ invSBOX[s2 & 255] ^ invKeySchedule[ksRow + 3];
			outputInt32[offset] = swapWord(t0 ^ initVector0);
			outputInt32[offset + 1] = swapWord(t3 ^ initVector1);
			outputInt32[offset + 2] = swapWord(t2 ^ initVector2);
			outputInt32[offset + 3] = swapWord(t1 ^ initVector3);
			initVector0 = inputWords0;
			initVector1 = inputWords1;
			initVector2 = inputWords2;
			initVector3 = inputWords3;
			offset = offset + 4;
		}
		return outputInt32.buffer;
	}
};
var FastAESKey = class {
	constructor(subtle, key, aesMode) {
		this.subtle = void 0;
		this.key = void 0;
		this.aesMode = void 0;
		this.subtle = subtle;
		this.key = key;
		this.aesMode = aesMode;
	}
	expandKey() {
		const subtleAlgoName = getSubtleAlgoName(this.aesMode);
		return this.subtle.importKey("raw", this.key, { name: subtleAlgoName }, false, ["encrypt", "decrypt"]);
	}
};
function getSubtleAlgoName(aesMode) {
	switch (aesMode) {
		case DecrypterAesMode.cbc: return "AES-CBC";
		case DecrypterAesMode.ctr: return "AES-CTR";
		default: throw new Error(`[FastAESKey] invalid aes mode ${aesMode}`);
	}
}
var CHUNK_SIZE = 16;
var Decrypter = class {
	constructor(config, useSoftware) {
		this.logEnabled = true;
		this.decryptRange = void 0;
		this.subtle = null;
		this.softwareDecrypter = null;
		this.key = null;
		this.fastAesKey = null;
		this.remainderData = null;
		this.currentIV = null;
		this.currentResult = null;
		this.useSoftware = void 0;
		this.enableSoftwareAES = void 0;
		this.enableSoftwareAES = config.enableSoftwareAES;
		if (useSoftware !== true) try {
			const browserCrypto = self.crypto;
			if (browserCrypto) this.subtle = browserCrypto.subtle || browserCrypto.webkitSubtle;
		} catch (e) {}
		this.useSoftware = !this.subtle;
	}
	destroy() {
		this.subtle = null;
		this.softwareDecrypter = null;
		this.key = null;
		this.fastAesKey = null;
		this.remainderData = null;
		this.currentIV = null;
		this.currentResult = null;
	}
	isSync() {
		return this.useSoftware;
	}
	flush() {
		const { currentResult, remainderData } = this;
		if (!currentResult || remainderData) {
			this.reset();
			return null;
		}
		const data = new Uint8Array(currentResult);
		this.reset();
		const decryptRange = this.decryptRange;
		if (decryptRange) {
			if (decryptRange.start === 0 && decryptRange.end >= data.length) return data;
			return data.slice(decryptRange.start, decryptRange.end);
		}
		return removePadding(data);
	}
	reset() {
		this.currentResult = null;
		this.currentIV = null;
		this.remainderData = null;
		if (this.softwareDecrypter) this.softwareDecrypter = null;
	}
	decrypt(data, key, iv, aesMode, decryptRange) {
		this.decryptRange = decryptRange;
		if (this.useSoftware || decryptRange) return new Promise((resolve, reject) => {
			const dataView = ArrayBuffer.isView(data) ? data : new Uint8Array(data);
			this.softwareDecrypt(dataView, key, iv, aesMode);
			const decryptResult = this.flush();
			if (decryptResult) resolve(decryptResult.buffer);
			else reject(/* @__PURE__ */ new Error("[softwareDecrypt] Failed to decrypt data"));
		});
		return this.webCryptoDecrypt(new Uint8Array(data), key, iv, aesMode);
	}
	softwareDecrypt(data, key, iv, aesMode) {
		const { currentIV, currentResult, remainderData } = this;
		if (aesMode !== DecrypterAesMode.cbc || key.byteLength !== 16) {
			logger.warn("SoftwareDecrypt: can only handle AES-128-CBC");
			return null;
		}
		this.logOnce("JS AES decrypt");
		if (remainderData) {
			data = appendUint8Array(remainderData, data);
			this.remainderData = null;
		}
		const currentChunk = this.getValidChunk(data);
		if (!currentChunk.length) return null;
		if (currentIV) iv = currentIV;
		let softwareDecrypter = this.softwareDecrypter;
		if (!softwareDecrypter) softwareDecrypter = this.softwareDecrypter = new AESDecryptor();
		softwareDecrypter.expandKey(key);
		const result = currentResult;
		this.currentResult = softwareDecrypter.decrypt(currentChunk.buffer, 0, iv);
		this.currentIV = currentChunk.slice(-16).buffer;
		if (!result) return null;
		return result;
	}
	webCryptoDecrypt(data, key, iv, aesMode) {
		if (this.key !== key || !this.fastAesKey) {
			if (!this.subtle) return Promise.resolve(this.onWebCryptoError(data, key, iv, aesMode));
			this.key = key;
			this.fastAesKey = new FastAESKey(this.subtle, key, aesMode);
		}
		return this.fastAesKey.expandKey().then((aesKey) => {
			if (!this.subtle) return Promise.reject(/* @__PURE__ */ new Error("web crypto not initialized"));
			this.logOnce("WebCrypto AES decrypt");
			return new AESCrypto(this.subtle, new Uint8Array(iv), aesMode).decrypt(data.buffer, aesKey);
		}).catch((err) => {
			logger.warn(`[decrypter]: WebCrypto Error, disable WebCrypto API, ${err.name}: ${err.message}`);
			return this.onWebCryptoError(data, key, iv, aesMode);
		});
	}
	onWebCryptoError(data, key, iv, aesMode) {
		const enableSoftwareAES = this.enableSoftwareAES;
		if (enableSoftwareAES) {
			this.useSoftware = true;
			this.logEnabled = true;
			this.softwareDecrypt(data, key, iv, aesMode);
			const decryptResult = this.flush();
			if (decryptResult) return decryptResult.buffer;
		}
		throw new Error("WebCrypto" + (enableSoftwareAES ? " and softwareDecrypt" : "") + ": failed to decrypt data");
	}
	getValidChunk(data) {
		let currentChunk = data;
		const splitPoint = data.length - data.length % CHUNK_SIZE;
		if (splitPoint !== data.length) {
			currentChunk = data.slice(0, splitPoint);
			this.remainderData = data.slice(splitPoint);
		}
		return currentChunk;
	}
	logOnce(msg) {
		if (!this.logEnabled) return;
		logger.log(`[decrypter]: ${msg}`);
		this.logEnabled = false;
	}
};
var MIN_CHUNK_SIZE = Math.pow(2, 17);
var FragmentLoader = class {
	constructor(config) {
		this.config = void 0;
		this.loader = null;
		this.partLoadTimeout = -1;
		this.config = config;
	}
	destroy() {
		if (this.loader) {
			this.loader.destroy();
			this.loader = null;
		}
	}
	abort() {
		if (this.loader) this.loader.abort();
	}
	load(frag, isIFrame, onProgress, progressGate) {
		const url = frag.url;
		if (!url) return Promise.reject(new LoadError({
			type: ErrorTypes.NETWORK_ERROR,
			details: ErrorDetails.FRAG_LOAD_ERROR,
			fatal: false,
			frag,
			error: /* @__PURE__ */ new Error(`Fragment does not have a ${url ? "part list" : "url"}`),
			networkDetails: null
		}));
		this.abort();
		const config = this.config;
		const FragmentILoader = config.fLoader;
		const DefaultILoader = config.loader;
		return new Promise((resolve, reject) => {
			if (this.loader) this.loader.destroy();
			if (frag.gap) {
				if (frag.tagList.some((tags) => tags[0] === "GAP")) {
					reject(createGapLoadError(frag));
					return;
				} else frag.gap = false;
			}
			const loader = this.loader = FragmentILoader ? new FragmentILoader(config) : new DefaultILoader(config);
			const loaderContext = createLoaderContext(frag, null, isIFrame);
			frag.loader = loader;
			const loadPolicy = getLoaderConfigWithoutReties(config.fragLoadPolicy.default);
			const loaderConfig = {
				loadPolicy,
				timeout: loadPolicy.maxLoadTimeMs,
				maxRetry: 0,
				retryDelay: 0,
				maxRetryDelay: 0,
				highWaterMark: frag.sn === "initSegment" ? Infinity : MIN_CHUNK_SIZE
			};
			loader.stats.retry = frag.stats.retry;
			frag.stats = loader.stats;
			const callbacks = {
				onSuccess: (response, stats, context, networkDetails) => {
					this.resetLoader(frag, loader);
					let payload = response.data;
					if (context.resetIV && frag.decryptdata) {
						frag.decryptdata.iv = new Uint8Array(payload.slice(0, 16));
						payload = payload.slice(16);
					}
					resolve({
						frag,
						part: null,
						payload,
						networkDetails
					});
				},
				onError: (response, context, networkDetails, stats) => {
					this.resetLoader(frag, loader);
					reject(new LoadError({
						type: ErrorTypes.NETWORK_ERROR,
						details: ErrorDetails.FRAG_LOAD_ERROR,
						fatal: false,
						frag,
						response: _objectSpread2({
							url,
							data: void 0
						}, response),
						error: /* @__PURE__ */ new Error(`HTTP Error ${response.code} ${response.text}`),
						networkDetails,
						stats
					}));
				},
				onAbort: (stats, context, networkDetails) => {
					this.resetLoader(frag, loader);
					reject(new LoadError({
						type: ErrorTypes.NETWORK_ERROR,
						details: ErrorDetails.INTERNAL_ABORTED,
						fatal: false,
						frag,
						error: /* @__PURE__ */ new Error("Aborted"),
						networkDetails,
						stats
					}));
				},
				onTimeout: (stats, context, networkDetails) => {
					this.resetLoader(frag, loader);
					reject(new LoadError({
						type: ErrorTypes.NETWORK_ERROR,
						details: ErrorDetails.FRAG_LOAD_TIMEOUT,
						fatal: false,
						frag,
						error: /* @__PURE__ */ new Error(`Timeout after ${loaderConfig.timeout}ms`),
						networkDetails,
						stats
					}));
				}
			};
			if (onProgress) {
				const onProgressGated = this.gateProgress(onProgress, progressGate);
				callbacks.onProgress = (stats, context, data, networkDetails) => onProgressGated({
					frag,
					part: null,
					payload: data,
					networkDetails
				});
			}
			loader.load(loaderContext, loaderConfig, callbacks);
		});
	}
	gateProgress(onProgress, progressGate) {
		let handleChunk = onProgress;
		if (progressGate) {
			const pendingChunks = [];
			let gateDone = false;
			progressGate.then(() => {
				gateDone = true;
				pendingChunks.forEach((chunk) => onProgress(chunk));
				pendingChunks.length = 0;
			}).catch(() => {});
			handleChunk = (data) => {
				if (gateDone) onProgress(data);
				else pendingChunks.push(data);
			};
		}
		return handleChunk;
	}
	loadPart(frag, part, onProgress) {
		this.abort();
		const config = this.config;
		const FragmentILoader = config.fLoader;
		const DefaultILoader = config.loader;
		return new Promise((resolve, reject) => {
			if (this.loader) this.loader.destroy();
			if (frag.gap || part.gap) {
				reject(createGapLoadError(frag, part));
				return;
			}
			const loader = this.loader = FragmentILoader ? new FragmentILoader(config) : new DefaultILoader(config);
			const loaderContext = createLoaderContext(frag, part);
			frag.loader = loader;
			const loadPolicy = getLoaderConfigWithoutReties(config.fragLoadPolicy.default);
			const loaderConfig = {
				loadPolicy,
				timeout: loadPolicy.maxLoadTimeMs,
				maxRetry: 0,
				retryDelay: 0,
				maxRetryDelay: 0,
				highWaterMark: MIN_CHUNK_SIZE
			};
			part.stats = loader.stats;
			loader.load(loaderContext, loaderConfig, {
				onSuccess: (response, stats, context, networkDetails) => {
					this.resetLoader(frag, loader);
					this.updateStatsFromPart(frag, part);
					const partLoadedData = {
						frag,
						part,
						payload: response.data,
						networkDetails
					};
					onProgress(partLoadedData);
					resolve(partLoadedData);
				},
				onError: (response, context, networkDetails, stats) => {
					this.resetLoader(frag, loader);
					reject(new LoadError({
						type: ErrorTypes.NETWORK_ERROR,
						details: ErrorDetails.FRAG_LOAD_ERROR,
						fatal: false,
						frag,
						part,
						response: _objectSpread2({
							url: loaderContext.url,
							data: void 0
						}, response),
						error: /* @__PURE__ */ new Error(`HTTP Error ${response.code} ${response.text}`),
						networkDetails,
						stats
					}));
				},
				onAbort: (stats, context, networkDetails) => {
					frag.stats.aborted = part.stats.aborted;
					this.resetLoader(frag, loader);
					reject(new LoadError({
						type: ErrorTypes.NETWORK_ERROR,
						details: ErrorDetails.INTERNAL_ABORTED,
						fatal: false,
						frag,
						part,
						error: /* @__PURE__ */ new Error("Aborted"),
						networkDetails,
						stats
					}));
				},
				onTimeout: (stats, context, networkDetails) => {
					this.resetLoader(frag, loader);
					reject(new LoadError({
						type: ErrorTypes.NETWORK_ERROR,
						details: ErrorDetails.FRAG_LOAD_TIMEOUT,
						fatal: false,
						frag,
						part,
						error: /* @__PURE__ */ new Error(`Timeout after ${loaderConfig.timeout}ms`),
						networkDetails,
						stats
					}));
				}
			});
		});
	}
	updateStatsFromPart(frag, part) {
		const fragStats = frag.stats;
		const partStats = part.stats;
		const partTotal = partStats.total;
		fragStats.loaded += partStats.loaded;
		if (partTotal) {
			const estTotalParts = Math.round(frag.duration / part.duration);
			const estLoadedParts = Math.min(Math.round(fragStats.loaded / partTotal), estTotalParts);
			const estRemainingBytes = (estTotalParts - estLoadedParts) * Math.round(fragStats.loaded / estLoadedParts);
			fragStats.total = fragStats.loaded + estRemainingBytes;
		} else fragStats.total = Math.max(fragStats.loaded, fragStats.total);
		const fragLoading = fragStats.loading;
		const partLoading = partStats.loading;
		if (fragLoading.start) fragLoading.first += partLoading.first - partLoading.start;
		else {
			fragLoading.start = partLoading.start;
			fragLoading.first = partLoading.first;
		}
		fragLoading.end = partLoading.end;
	}
	resetLoader(frag, loader) {
		frag.loader = null;
		frag.url = null;
		if (this.loader === loader) {
			self.clearTimeout(this.partLoadTimeout);
			this.loader = null;
		}
		loader.destroy();
	}
};
function createLoaderContext(frag, part = null, isIFrame) {
	const segment = part || frag;
	const loaderContext = {
		type: LoaderContextType.MEDIA_FRAGMENT,
		frag,
		part,
		responseType: "arraybuffer",
		url: segment.url,
		headers: {},
		rangeStart: 0,
		rangeEnd: 0
	};
	const aesAdjustments = getAESAdjustments(frag, part, isIFrame);
	if (aesAdjustments.resetIV) loaderContext.resetIV = true;
	if (aesAdjustments.byteRange) {
		loaderContext.rangeStart = aesAdjustments.byteRange.start;
		loaderContext.rangeEnd = aesAdjustments.byteRange.end;
	}
	return loaderContext;
}
function getAESAdjustments(frag, part = null, isIFrame) {
	const result = {};
	const segment = part || frag;
	const start = segment.byteRangeStartOffset;
	const end = segment.byteRangeEndOffset;
	if (isFiniteNumber(start) && isFiniteNumber(end)) {
		var _frag$decryptdata;
		if ((frag.sn === "initSegment" || isIFrame) && isMethodFullSegmentAesCbc((_frag$decryptdata = frag.decryptdata) == null ? void 0 : _frag$decryptdata.method)) {
			let byteRangeStart = Math.floor(start / 16) * 16;
			const byteRangeEnd = Math.ceil(end / 16) * 16;
			result.decryptRange = {
				start: start - byteRangeStart,
				end: end - byteRangeStart
			};
			if (byteRangeStart >= 16) {
				result.resetIV = true;
				byteRangeStart = byteRangeStart - 16;
			}
			result.byteRange = {
				start: byteRangeStart,
				end: byteRangeEnd
			};
		} else result.byteRange = {
			start,
			end
		};
	}
	return result;
}
function createGapLoadError(frag, part) {
	const error = /* @__PURE__ */ new Error(`GAP ${frag.gap ? "tag" : "attribute"} found`);
	const errorData = {
		type: ErrorTypes.MEDIA_ERROR,
		details: ErrorDetails.FRAG_GAP,
		fatal: false,
		frag,
		error,
		networkDetails: null
	};
	if (part) errorData.part = part;
	(part ? part : frag).stats.aborted = true;
	return new LoadError(errorData);
}
function isMethodFullSegmentAesCbc(method) {
	return method === "AES-128" || method === "AES-256";
}
var LoadError = class extends Error {
	constructor(data) {
		super(data.error.message);
		this.data = void 0;
		this.data = data;
	}
};
/**
* @ignore
* Sub-class specialization of EventHandler base class.
*
* TaskLoop allows to schedule a task function being called (optionnaly repeatedly) on the main loop,
* scheduled asynchroneously, avoiding recursive calls in the same tick.
*
* The task itself is implemented in `doTick`. It can be requested and called for single execution
* using the `tick` method.
*
* It will be assured that the task execution method (`tick`) only gets called once per main loop "tick",
* no matter how often it gets requested for execution. Execution in further ticks will be scheduled accordingly.
*
* If further execution requests have already been scheduled on the next tick, it can be checked with `hasNextTick`,
* and cancelled with `clearNextTick`.
*
* The task can be scheduled as an interval repeatedly with a period as parameter (see `setInterval`, `clearInterval`).
*
* Sub-classes need to implement the `doTick` method which will effectively have the task execution routine.
*
* Further explanations:
*
* The baseclass has a `tick` method that will schedule the doTick call. It may be called synchroneously
* only for a stack-depth of one. On re-entrant calls, sub-sequent calls are scheduled for next main loop ticks.
*
* When the task execution (`tick` method) is called in re-entrant way this is detected and
* we are limiting the task execution per call stack to exactly one, but scheduling/post-poning further
* task processing on the next main loop iteration (also known as "next tick" in the Node/JS runtime lingo).
*/
var TaskLoop = class extends Logger {
	constructor(label, logger) {
		super(label, logger);
		this._boundTick = void 0;
		this._tickTimer = null;
		this._tickInterval = null;
		this._tickCallCount = 0;
		this._boundTick = this.tick.bind(this);
	}
	destroy() {
		this.onHandlerDestroying();
		this.onHandlerDestroyed();
	}
	onHandlerDestroying() {
		this.clearNextTick();
		this.clearInterval();
	}
	onHandlerDestroyed() {}
	hasInterval() {
		return !!this._tickInterval;
	}
	hasNextTick() {
		return !!this._tickTimer;
	}
	/**
	* @param millis - Interval time (ms)
	* @eturns True when interval has been scheduled, false when already scheduled (no effect)
	*/
	setInterval(millis) {
		if (!this._tickInterval) {
			this._tickCallCount = 0;
			this._tickInterval = self.setInterval(this._boundTick, millis);
			return true;
		}
		return false;
	}
	/**
	* @returns True when interval was cleared, false when none was set (no effect)
	*/
	clearInterval() {
		if (this._tickInterval) {
			self.clearInterval(this._tickInterval);
			this._tickInterval = null;
			return true;
		}
		return false;
	}
	/**
	* @returns True when timeout was cleared, false when none was set (no effect)
	*/
	clearNextTick() {
		if (this._tickTimer) {
			self.clearTimeout(this._tickTimer);
			this._tickTimer = null;
			return true;
		}
		return false;
	}
	/**
	* Will call the subclass doTick implementation in this main loop tick
	* or in the next one (via setTimeout(,0)) in case it has already been called
	* in this tick (in case this is a re-entrant call).
	*/
	tick() {
		this._tickCallCount++;
		if (this._tickCallCount === 1) {
			this.doTick();
			if (this._tickCallCount > 1) this.tickImmediate();
			this._tickCallCount = 0;
		} else {
			this.log(`possible exception thrown in task-loop (${this.constructor.name}.doTick)`);
			this._tickCallCount = 0;
		}
	}
	tickImmediate() {
		this.clearNextTick();
		this._tickTimer = self.setTimeout(this._boundTick, 0);
	}
	/**
	* For subclass to implement task logic
	* @abstract
	*/
	doTick() {}
};
var ChunkMetadata = class {
	constructor(level, sn, id, size = 0, part = -1, partial = false, duration, iframe, decryptRange) {
		this.level = void 0;
		this.sn = void 0;
		this.part = void 0;
		this.id = void 0;
		this.size = void 0;
		this.partial = void 0;
		this.iframe = void 0;
		this.duration = void 0;
		this.decryptRange = void 0;
		this.transmuxing = getNewPerformanceTiming();
		this.buffering = {
			audio: getNewPerformanceTiming(),
			video: getNewPerformanceTiming(),
			audiovideo: getNewPerformanceTiming()
		};
		this.level = level;
		this.sn = sn;
		this.id = id;
		this.size = size;
		this.part = part;
		this.partial = partial;
		this.duration = duration || 0;
		this.decryptRange = decryptRange;
		this.iframe = iframe || false;
	}
};
function getNewPerformanceTiming() {
	return {
		start: 0,
		executeStart: 0,
		executeEnd: 0,
		end: 0
	};
}
function findFirstFragWithCC(fragments, cc) {
	for (let i = 0, len = fragments.length; i < len; i++) {
		var _fragments$i;
		if (((_fragments$i = fragments[i]) == null ? void 0 : _fragments$i.cc) === cc) return fragments[i];
	}
	return null;
}
function shouldAlignOnDiscontinuities(refDetails, details) {
	if (refDetails) {
		if (details.startCC < refDetails.endCC && details.endCC > refDetails.startCC) return true;
	}
	return false;
}
function adjustFragmentStart(frag, sliding) {
	const start = frag.start + sliding;
	frag.setStart(start);
}
function adjustSlidingStart(sliding, details) {
	const fragments = details.fragments;
	for (let i = 0, len = fragments.length; i < len; i++) adjustFragmentStart(fragments[i], sliding);
	if (details.fragmentHint) adjustFragmentStart(details.fragmentHint, sliding);
	details.alignedSliding = true;
}
/**
* Using the parameters of the last level, this function computes PTS' of the new fragments so that they form a
* contiguous stream with the last fragments.
* The PTS of a fragment lets Hls.js know where it fits into a stream - by knowing every PTS, we know which fragment to
* download at any given time. PTS is normally computed when the fragment is demuxed, so taking this step saves us time
* and an extra download.
* @param lastLevel
* @param details
*/
function alignStream(switchDetails, details, logger) {
	if (!switchDetails) return;
	alignDiscontinuities(details, switchDetails, logger);
	if (!details.alignedSliding) alignMediaPlaylistByPDT(details, switchDetails, logger);
	if (!details.alignedSliding && !details.skippedSegments) adjustSliding(switchDetails, details, false, logger);
}
/**
* Ajust the start of fragments in `details` by the difference in time between fragments of the latest
* shared discontinuity sequence change.
* @param lastLevel - The details of the last loaded level
* @param details - The details of the new level
*/
function alignDiscontinuities(details, refDetails, logger) {
	if (!shouldAlignOnDiscontinuities(refDetails, details)) return;
	const targetCC = Math.min(refDetails.endCC, details.endCC);
	const refFrag = findFirstFragWithCC(refDetails.fragments, targetCC);
	const frag = findFirstFragWithCC(details.fragments, targetCC);
	if (!refFrag || !frag) return;
	const delta = refFrag.start - frag.start;
	logger.log(`Aligning playlists using dicontinuity sequence ${targetCC} (diff: ${delta})`);
	adjustSlidingStart(delta, details);
}
/**
* Ensures appropriate time-alignment between renditions based on PDT.
* This function assumes the timelines represented in `refDetails` are accurate, including the PDTs
* for the last discontinuity sequence number shared by both playlists when present,
* and uses the "wallclock"/PDT timeline as a cross-reference to `details`, adjusting the presentation
* times/timelines of `details` accordingly.
* Given the asynchronous nature of fetches and initial loads of live `main` and audio/subtitle tracks,
* the primary purpose of this function is to ensure the "local timelines" of audio/subtitle tracks
* are aligned to the main/video timeline, using PDT as the cross-reference/"anchor" that should
* be consistent across playlists, per the HLS spec.
* @param details - The details of the rendition you'd like to time-align (e.g. an audio rendition).
* @param refDetails - The details of the reference rendition with start and PDT times for alignment.
*/
function alignMediaPlaylistByPDT(details, refDetails, logger) {
	if (!details.hasProgramDateTime || !refDetails.hasProgramDateTime) return;
	const fragments = details.fragments;
	const refFragments = refDetails.fragments;
	if (!fragments.length || !refFragments.length) return;
	let refFrag;
	let frag;
	const targetCC = Math.min(refDetails.endCC, details.endCC);
	if (refDetails.startCC < targetCC && details.startCC < targetCC) {
		refFrag = findFirstFragWithCC(refFragments, targetCC);
		frag = findFirstFragWithCC(fragments, targetCC);
	}
	if (!refFrag || !frag) {
		refFrag = refFragments[Math.floor(refFragments.length / 2)] || refFragments.filter((f) => !!f)[0];
		frag = findFirstFragWithCC(fragments, refFrag.cc) || fragments[Math.floor(fragments.length / 2)];
	}
	const refPDT = refFrag.programDateTime;
	const targetPDT = frag.programDateTime;
	if (!refPDT || !targetPDT) return;
	const dateDifference = (targetPDT - refPDT) / 1e3;
	if (Math.abs(dateDifference) > Math.max(60, details.totalduration)) {
		logger.log(`Cannot align playlists using PDT without overlap (${Math.abs(dateDifference)} > ${details.totalduration})`);
		return;
	}
	const delta = dateDifference - (frag.start - refFrag.start);
	logger.log(`Aligning playlists using PDT (diff: ${delta})`);
	adjustSlidingStart(delta, details);
}
var State = {
	STOPPED: "STOPPED",
	IDLE: "IDLE",
	KEY_LOADING: "KEY_LOADING",
	FRAG_LOADING: "FRAG_LOADING",
	FRAG_LOADING_WAITING_RETRY: "FRAG_LOADING_WAITING_RETRY",
	PARSING: "PARSING",
	PARSED: "PARSED",
	ENDED: "ENDED",
	ERROR: "ERROR",
	WAITING_LEVEL: "WAITING_LEVEL"
};
var BaseStreamController = class extends TaskLoop {
	constructor(hls, fragmentTracker, keyLoader, logPrefix, playlistType) {
		super(logPrefix, hls.logger);
		this.hls = void 0;
		this.fragPrevious = null;
		this.fragCurrent = null;
		this.fragPlaying = null;
		this.fragmentTracker = void 0;
		this.transmuxer = null;
		this._state = State.STOPPED;
		this.playlistType = void 0;
		this.media = null;
		this.mediaBuffer = null;
		this.config = void 0;
		this.bitrateTest = false;
		this.lastCurrentTime = 0;
		this.nextLoadPosition = 0;
		this.startPosition = -1;
		this.startTimeOffset = null;
		this.retryDate = 0;
		this.levels = null;
		this.fragmentLoader = void 0;
		this.initFragmentLoader = void 0;
		this.keyLoader = void 0;
		this.levelLastLoaded = null;
		this.startFragRequested = false;
		this.decrypter = void 0;
		this.initPTS = [];
		this.buffering = true;
		this.loadingParts = false;
		this.loopSn = void 0;
		this.onMediaSeeking = () => {
			const { config, fragCurrent, media, mediaBuffer, state } = this;
			const currentTime = media ? media.currentTime : 0;
			const bufferInfo = BufferHelper.bufferInfo(mediaBuffer ? mediaBuffer : media, currentTime, config.maxBufferHole);
			const fowardBuffer = bufferInfo.len;
			this.log(`Media seeking to ${currentTime}, state: ${state}, ${!fowardBuffer ? "out of" : "in"} buffer`);
			if (this.state === State.ENDED) this.resetLoadingState();
			else if (fragCurrent) {
				const tolerance = config.maxFragLookUpTolerance;
				const fragStartOffset = fragCurrent.start - tolerance;
				const fragEndOffset = fragCurrent.start + fragCurrent.duration + tolerance;
				if (!fowardBuffer || fragEndOffset < bufferInfo.start || fragStartOffset > bufferInfo.end) {
					const beforeFragment = currentTime < fragStartOffset;
					const pastFragment = currentTime > fragEndOffset;
					if (beforeFragment || pastFragment) {
						if (fragCurrent.loader && (pastFragment || !this.isFragmentNearlyDownloaded(fragCurrent))) {
							this.log(`Cancelling fragment load for seek (sn: ${fragCurrent.sn}) - ${beforeFragment ? "backward" : "forward"} seek`);
							fragCurrent.abortRequests();
							this.resetLoadingState();
						} else this.fragPrevious = null;
					}
				}
			}
			if (media) {
				var _this$hls;
				if ((_this$hls = this.hls) != null && _this$hls.hasEnoughToStart && !fowardBuffer && currentTime !== this.startPosition) this.fragmentTracker.removeFragmentsInRange(currentTime, Infinity, this.playlistType, true);
				if (currentTime > this.lastCurrentTime) this.lastCurrentTime = currentTime;
				if (!this.loadingParts) {
					const bufferEnd = Math.max(bufferInfo.end, currentTime);
					const shouldLoadParts = this.shouldLoadParts(this.getLevelDetails(), bufferEnd);
					if (shouldLoadParts) {
						this.log(`LL-Part loading ON after seeking to ${currentTime} with buffer @${bufferEnd}`);
						this.loadingParts = shouldLoadParts;
					}
				}
			}
			const bufferEmpty = !BufferHelper.isBuffered(media, currentTime);
			if (!this.hls.hasEnoughToStart || bufferEmpty) {
				this.log(`Setting ${bufferEmpty ? "startPosition" : "nextLoadPosition"} to ${currentTime} for seek without enough to start`);
				this.nextLoadPosition = currentTime;
				if (bufferEmpty) this.startPosition = currentTime;
				else this.lastCurrentTime = currentTime;
			}
			if (fowardBuffer < 1 && this.state === State.IDLE) this.tickImmediate();
		};
		this.onMediaEnded = () => {
			this.log(`setting startPosition to 0 because media ended`);
			this.startPosition = this.nextLoadPosition = this.lastCurrentTime = 0;
		};
		this.playlistType = playlistType;
		this.hls = hls;
		this.fragmentLoader = new FragmentLoader(hls.config);
		this.initFragmentLoader = new FragmentLoader(hls.config);
		this.keyLoader = keyLoader;
		this.fragmentTracker = fragmentTracker;
		this.config = hls.config;
		this.decrypter = new Decrypter(hls.config);
	}
	registerListeners() {
		const { hls } = this;
		hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
		hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
		hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.on(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
		hls.on(Events.ERROR, this.onError, this);
	}
	unregisterListeners() {
		const { hls } = this;
		hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
		hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
		hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.off(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
		hls.off(Events.ERROR, this.onError, this);
	}
	doTick() {}
	onTickEnd() {
		const { media } = this;
		if (media != null && media.readyState && media.seeking === false) this.lastCurrentTime = media.currentTime;
	}
	startLoad(startPosition) {}
	stopLoad() {
		if (this.state === State.STOPPED) return;
		this.fragmentLoader.abort();
		this.initFragmentLoader.abort();
		this.keyLoader.abort(this.playlistType);
		const frag = this.fragCurrent;
		if (frag != null && frag.loader) {
			frag.abortRequests();
			this.fragmentTracker.removeFragment(frag);
		}
		this.resetTransmuxer();
		this.fragCurrent = null;
		this.fragPrevious = null;
		this.clearInterval();
		this.clearNextTick();
		this.state = State.STOPPED;
	}
	get startPositionValue() {
		const { nextLoadPosition, startPosition } = this;
		if (startPosition === -1 && nextLoadPosition) {
			const details = this.getLevelDetails();
			if (details != null && details.live) return (this.hls.liveSyncPosition || details.fragmentStart) + this.timelineOffset;
			return nextLoadPosition;
		}
		return startPosition;
	}
	get bufferingEnabled() {
		return this.buffering;
	}
	/**
	* Get backtrack fragment. Returns null in base class.
	* Override in stream-controller to return actual backtrack fragment.
	*/
	get backtrackFragment() {}
	/**
	* Set backtrack fragment. No-op in base class.
	* Override in stream-controller to set actual backtrack fragment.
	*/
	set backtrackFragment(_value) {}
	/**
	* Get could backtrack flag. Returns false in base class.
	* Override in stream-controller to return actual value.
	*/
	get couldBacktrack() {
		return false;
	}
	/**
	* Set could backtrack flag. No-op in base class.
	* Override in stream-controller to set actual value.
	*/
	set couldBacktrack(_value) {}
	pauseBuffering() {
		this.buffering = false;
	}
	resumeBuffering() {
		this.buffering = true;
	}
	get inFlightFrag() {
		return {
			frag: this.fragCurrent,
			state: this.state
		};
	}
	_streamEnded(bufferInfo, levelDetails) {
		if (levelDetails.live || !this.media) return false;
		const bufferEnd = bufferInfo.end || 0;
		const timelineStart = this.config.timelineOffset || 0;
		if (bufferEnd <= timelineStart) return false;
		const bufferedRanges = bufferInfo.buffered;
		if (this.config.maxBufferHole && bufferedRanges && bufferedRanges.length > 1) bufferInfo = BufferHelper.bufferedInfo(bufferedRanges, bufferInfo.start, 0);
		const nextStart = bufferInfo.nextStart;
		if (nextStart && nextStart > timelineStart && nextStart < levelDetails.edge) return false;
		if (this.media.currentTime < bufferInfo.start) return false;
		const partList = levelDetails.partList;
		if (partList != null && partList.length) {
			const lastPart = partList[partList.length - 1];
			return BufferHelper.isBuffered(this.media, lastPart.start + lastPart.duration / 2);
		}
		const lastFragment = levelDetails.fragments[levelDetails.fragments.length - 1];
		return this.fragmentTracker.isEndListAppended(lastFragment.type);
	}
	getLevelDetails() {
		if (this.levels && this.levelLastLoaded !== null) return this.levelLastLoaded.details;
	}
	get timelineOffset() {
		const configuredTimelineOffset = this.config.timelineOffset;
		if (configuredTimelineOffset) {
			var _this$getLevelDetails;
			return ((_this$getLevelDetails = this.getLevelDetails()) == null ? void 0 : _this$getLevelDetails.appliedTimelineOffset) || configuredTimelineOffset;
		}
		return 0;
	}
	onMediaAttached(event, data) {
		const media = this.media = this.mediaBuffer = data.media;
		addEventListener(media, "seeking", this.onMediaSeeking);
		addEventListener(media, "ended", this.onMediaEnded);
		const config = this.config;
		if (this.levels && config.autoStartLoad && this.state === State.STOPPED) this.startLoad(config.startPosition);
	}
	onMediaDetaching(event, data) {
		this.fragPlaying = null;
		const transferringMedia = !!data.transferMedia;
		const media = this.media;
		if (media === null) return;
		if (media.ended) {
			this.log("MSE detaching and video ended, reset startPosition");
			this.startPosition = this.lastCurrentTime = 0;
		}
		removeEventListener(media, "seeking", this.onMediaSeeking);
		removeEventListener(media, "ended", this.onMediaEnded);
		this.media = this.mediaBuffer = null;
		this.loopSn = void 0;
		if (transferringMedia) {
			this.resetLoadingState();
			this.resetTransmuxer();
			return;
		}
		this.loadingParts = false;
		const { fragmentTracker } = this;
		const gaps = fragmentTracker.gapFragments();
		fragmentTracker.removeAllFragments();
		gaps.forEach((frag) => fragmentTracker.addAsGap(frag));
		this.stopLoad();
	}
	onManifestLoading() {
		this.initPTS = [];
		this.fragPlaying = this.levels = this.levelLastLoaded = this.fragCurrent = null;
		this.lastCurrentTime = this.nextLoadPosition = 0;
		this.startPosition = -1;
		this.startFragRequested = false;
	}
	onError(event, data) {}
	onManifestLoaded(event, data) {
		this.startTimeOffset = data.startTimeOffset;
	}
	onHandlerDestroying() {
		this.stopLoad();
		if (this.transmuxer) {
			this.transmuxer.destroy();
			this.transmuxer = null;
		}
		super.onHandlerDestroying();
		this.hls = this.onMediaSeeking = this.onMediaEnded = null;
	}
	onHandlerDestroyed() {
		this.state = State.STOPPED;
		if (this.fragmentLoader) this.fragmentLoader.destroy();
		if (this.initFragmentLoader) this.initFragmentLoader.destroy();
		if (this.keyLoader) this.keyLoader.destroy();
		if (this.decrypter) this.decrypter.destroy();
		this.hls = this.decrypter = this.keyLoader = null;
		this.fragmentLoader = this.initFragmentLoader = this.fragmentTracker = null;
		super.onHandlerDestroyed();
	}
	loadFragment(frag, level, targetBufferTime) {
		this.startFragRequested = true;
		this._loadFragForPlayback(frag, level, targetBufferTime);
	}
	_loadFragForPlayback(fragment, level, targetBufferTime) {
		const progressCallback = (data) => {
			const frag = data.frag;
			if (this.fragContextChanged(frag)) {
				this.warn(`${frag.type} sn: ${frag.sn}${data.part ? " part: " + data.part.index : ""} of ${this.fragInfo(frag, false, data.part)} was dropped during download.`);
				this.fragmentTracker.removeFragment(frag);
				return;
			}
			const chunkCount = ++frag.stats.chunkCount;
			this.log(`load progress ${frag.type} sn: ${frag.sn}${data.part ? " part: " + data.part.index : ""} of ${this.fragInfo(frag, false, data.part)} chunk: ${chunkCount}`);
			this._handleFragmentLoadProgress(data);
		};
		this._doFragLoad(fragment, level, targetBufferTime, progressCallback).then((data) => {
			if (!data) return;
			const state = this.state;
			const frag = data.frag;
			if (this.fragContextChanged(frag)) {
				if (state === State.FRAG_LOADING || !this.fragCurrent && state === State.PARSING) {
					this.fragmentTracker.removeFragment(frag);
					this.state = State.IDLE;
				}
				return;
			}
			if ("payload" in data) {
				this.log(`Loaded ${frag.type} sn: ${frag.sn} of ${this.playlistLabel()} ${frag.level} (bytes ${frag.stats.loaded})`);
				this.hls.trigger(Events.FRAG_LOADED, data);
			}
			this._handleFragmentLoadComplete(data);
		}).catch((reason) => {
			if (this.state === State.STOPPED || this.state === State.ERROR) return;
			this.log(`Frag error ${fragment.type} sn:${fragment.sn} cc:${fragment.cc}: ${(reason == null ? void 0 : reason.message) || reason}`);
			this.resetFragmentLoading(fragment);
		});
	}
	clearTrackerIfNeeded(frag) {
		var _this$mediaBuffer;
		const { fragmentTracker } = this;
		if (fragmentTracker.getState(frag) === FragmentState.APPENDING) {
			const playlistType = frag.type;
			const bufferedInfo = this.getFwdBufferInfo(this.mediaBuffer, playlistType);
			const minForwardBufferLength = Math.max(frag.duration, bufferedInfo ? bufferedInfo.len : this.config.maxBufferLength);
			const backtrackFragment = this.backtrackFragment;
			if ((backtrackFragment ? frag.sn - backtrackFragment.sn : 0) === 1 || this.reduceMaxBufferLength(minForwardBufferLength, frag.duration)) fragmentTracker.removeFragment(frag);
		} else if (((_this$mediaBuffer = this.mediaBuffer) == null ? void 0 : _this$mediaBuffer.buffered.length) === 0) fragmentTracker.removeAllFragments();
		else if (fragmentTracker.hasParts(frag.type)) {
			fragmentTracker.detectPartialFragments({
				frag,
				part: null,
				stats: frag.stats,
				id: frag.type
			});
			if (fragmentTracker.getState(frag) === FragmentState.PARTIAL) fragmentTracker.removeFragment(frag);
		}
	}
	checkLiveUpdate(details) {
		if (details.updated && !details.live) {
			const fragmentTracker = this.fragmentTracker;
			const lastFragment = details.fragments[details.fragments.length - 1];
			if (lastFragment.endList && !fragmentTracker.isEndListAppended(this.playlistType)) {
				const fragmentAtEnd = fragmentTracker.getPartialFragment(lastFragment.end);
				if (fragmentAtEnd) {
					fragmentTracker.removeFragment(fragmentAtEnd);
					fragmentTracker.fragBuffered(lastFragment, true);
				}
			}
			fragmentTracker.detectPartialFragments({
				frag: lastFragment,
				part: null,
				stats: lastFragment.stats,
				id: lastFragment.type
			});
		}
		if (!details.fragments[0]) details.deltaUpdateFailed = true;
	}
	waitForLive(levelInfo) {
		const details = levelInfo.details;
		return (details == null ? void 0 : details.live) && details.type !== "EVENT" && details.advancedDateTime !== void 0 && (details.expired || this.loadingParts && details.partsExpired || details.misses < 3 && details.partEnd <= this.getLoadPosition());
	}
	flushMainBuffer(startOffset, endOffset, type = null) {
		if (!(startOffset - endOffset)) return;
		const flushScope = {
			startOffset,
			endOffset,
			type
		};
		this.hls.trigger(Events.BUFFER_FLUSHING, flushScope);
	}
	_loadInitSegment(initFrag) {
		const { hls } = this;
		this.initFragmentLoader.abort();
		hls.trigger(Events.FRAG_LOADING, {
			frag: initFrag,
			targetBufferTime: 0
		});
		return this.initFragmentLoader.load(initFrag).then((data) => {
			var _this$fragCurrent;
			const frag = data.frag;
			if (!this.levels || !fragmentsAreEqual(frag, (_this$fragCurrent = this.fragCurrent) == null ? void 0 : _this$fragCurrent.initSegment)) throw new LoadError({
				type: ErrorTypes.NETWORK_ERROR,
				details: ErrorDetails.INTERNAL_ABORTED,
				error: /* @__PURE__ */ new Error("init load aborted"),
				fatal: false,
				frag,
				networkDetails: null
			});
			return data;
		}).then((data) => {
			const { frag, payload } = data;
			const decryptData = frag.decryptdata;
			if (payload && payload.byteLength > 0 && decryptData != null && decryptData.key && decryptData.iv && isFullSegmentEncryption(decryptData.method)) {
				const startTime = self.performance.now();
				const { decryptRange } = getAESAdjustments(frag, null, this.iframesOnly);
				return this.decrypter.decrypt(new Uint8Array(payload), decryptData.key.buffer, decryptData.iv.buffer, getAesModeFromFullSegmentMethod(decryptData.method), decryptRange).catch((err) => {
					hls.trigger(Events.ERROR, {
						type: ErrorTypes.MEDIA_ERROR,
						details: ErrorDetails.FRAG_DECRYPT_ERROR,
						fatal: false,
						error: err,
						reason: err.message,
						frag
					});
					this.fragmentLoader.abort();
					throw err;
				}).then((decryptedData) => {
					const endTime = self.performance.now();
					hls.trigger(Events.FRAG_DECRYPTED, {
						frag,
						part: null,
						payload: decryptedData,
						stats: {
							tstart: startTime,
							tdecrypt: endTime
						}
					});
					data.payload = decryptedData;
					return this.completeInitSegmentLoad(data);
				});
			}
			return this.completeInitSegmentLoad(data);
		});
	}
	completeInitSegmentLoad(data) {
		const stats = data.frag.stats;
		data.frag.data = new Uint8Array(data.payload);
		stats.parsing.start = stats.buffering.start = self.performance.now();
		stats.parsing.end = stats.buffering.end = self.performance.now();
	}
	loadInitSegmentIfNeeded(mediaFrag) {
		const { initSegment } = mediaFrag;
		if (!this.bitrateTest && isMediaFragment(mediaFrag) && initSegment && !initSegment.data) {
			var _initSegment$decryptd;
			return (initSegment.encrypted && !((_initSegment$decryptd = initSegment.decryptdata) != null && _initSegment$decryptd.key) ? this.keyLoader.load(initSegment).then(() => this._loadInitSegment(initSegment)) : this._loadInitSegment(initSegment)).catch((reason) => {
				if (this.state === State.STOPPED || this.state === State.ERROR) throw reason;
				if ("data" in reason) {
					this.fragmentLoader.abort();
					this.handleFragLoadError(reason, mediaFrag);
				}
				this.resetFragmentLoading(mediaFrag);
				throw reason;
			});
		}
	}
	unhandledEncryptionError(initSegment, frag) {
		var _tracks$audio, _tracks$video;
		const tracks = initSegment.tracks;
		if (tracks && !frag.encrypted && ((_tracks$audio = tracks.audio) != null && _tracks$audio.encrypted || (_tracks$video = tracks.video) != null && _tracks$video.encrypted) && (!this.config.emeEnabled || !this.keyLoader.emeController)) {
			const media = this.media;
			const error = /* @__PURE__ */ new Error("EME not supported (light build)");
			this.warn(error.message);
			if (!media || media.mediaKeys) return false;
			this.hls.trigger(Events.ERROR, {
				type: ErrorTypes.KEY_SYSTEM_ERROR,
				details: ErrorDetails.KEY_SYSTEM_NO_KEYS,
				fatal: true,
				error,
				frag
			});
			this.resetTransmuxer();
			return true;
		}
		return false;
	}
	fragContextChanged(frag) {
		const { fragCurrent } = this;
		return !frag || !fragmentsAreEqual(frag, fragCurrent);
	}
	fragBufferedComplete(frag, part) {
		const media = this.mediaBuffer ? this.mediaBuffer : this.media;
		this.log(`Buffered ${frag.type} sn: ${frag.sn}${part ? " part: " + part.index : ""} of ${this.fragInfo(frag, false, part)} > buffer:${media ? timeRangesToString(BufferHelper.getBuffered(media)) : "(detached)"})`);
		if (isMediaFragment(frag)) {
			var _this$levels;
			if (frag.type !== PlaylistLevelType.SUBTITLE) {
				const el = frag.elementaryStreams;
				if (!Object.keys(el).some((type) => !!el[type])) {
					this.state = State.IDLE;
					return;
				}
			}
			const level = (_this$levels = this.levels) == null ? void 0 : _this$levels[frag.level];
			if (level != null && level.fragmentError && (part || this.fragmentTracker.getState(frag) !== FragmentState.PARTIAL)) {
				this.log(`Resetting level fragment error count of ${level.fragmentError} on frag buffered`);
				level.fragmentError = 0;
				frag.stats.retry = 0;
			}
		}
		this.state = State.IDLE;
	}
	_handleFragmentLoadComplete(fragLoadedEndData) {
		const { transmuxer } = this;
		if (!transmuxer) return;
		const frag = fragLoadedEndData.frag;
		const { part, partsLoaded } = fragLoadedEndData;
		const complete = !partsLoaded || partsLoaded.length === 0 || partsLoaded.some((fragLoaded) => !fragLoaded);
		const { decryptRange } = getAESAdjustments(frag, part);
		const chunkMeta = new ChunkMetadata(frag.level, frag.sn, frag.stats.chunkCount + 1, 0, part ? part.index : -1, !complete, frag.duration, this.iframesOnly, decryptRange);
		this.log(`load complete ${frag.type} sn: ${frag.sn}${part ? " part: " + part.index : ""} of ${this.fragInfo(frag, false, part)}`);
		transmuxer.flush(chunkMeta);
	}
	_handleFragmentLoadProgress(frag) {}
	loadKeyFor(frag, details, initDataPromise) {
		var _frag$decryptdata;
		let keyLoadingPromise = null;
		if (frag.encrypted && !((_frag$decryptdata = frag.decryptdata) != null && _frag$decryptdata.key)) {
			this.log(`Loading key for ${frag.sn} of [${details.startSN}-${details.endSN}], ${this.playlistLabel()} ${frag.level}`);
			this.state = State.KEY_LOADING;
			keyLoadingPromise = this.keyLoader.load(frag, initDataPromise).then((keyLoadedData) => {
				if (!this.fragContextChanged(keyLoadedData.frag)) {
					this.hls.trigger(Events.KEY_LOADED, keyLoadedData);
					if (this.state === State.KEY_LOADING) this.state = State.IDLE;
					return keyLoadedData;
				}
			});
			this.hls.trigger(Events.KEY_LOADING, { frag });
		} else if (!frag.encrypted) {
			keyLoadingPromise = this.keyLoader.loadClear(frag, details.encryptedFragments, this.startFragRequested);
			if (keyLoadingPromise) this.log(`[eme] blocking frag sn: ${frag.sn} load until media-keys acquired`);
		}
		return keyLoadingPromise;
	}
	_doFragLoad(frag, level, targetBufferTime = null, progressCallback) {
		this.fragCurrent = frag;
		const details = level.details;
		if (!this.levels || !details) throw new Error(`frag load aborted, missing level${details ? "" : " detail"}s`);
		const fragPrevious = this.fragPrevious;
		if (!mediaFragmentsAreEqual(frag, fragPrevious)) {
			const shouldLoadParts = this.shouldLoadParts(level.details, frag.end);
			if (shouldLoadParts !== this.loadingParts) {
				this.log(`LL-Part loading ${shouldLoadParts ? "ON" : "OFF"} loading sn ${fragPrevious == null ? void 0 : fragPrevious.sn}->${frag.sn}`);
				this.loadingParts = shouldLoadParts;
			}
		}
		targetBufferTime = Math.max(frag.start, targetBufferTime || 0);
		if (this.loadingParts) {
			const partList = details.partList;
			if (partList && progressCallback) {
				if (targetBufferTime > details.fragmentEnd && details.fragmentHint) frag = details.fragmentHint;
				const partIndex = this.getNextPart(partList, frag, targetBufferTime);
				if (partIndex > -1) {
					const part = partList[partIndex];
					frag = this.fragCurrent = part.fragment;
					if (!mediaFragmentsAreEqual(frag, fragPrevious) && !this.shouldLoadParts(level.details, frag.end)) {
						this.log(`LL-Part loading OFF @${this.playhead} next part: ${this.fragInfo(frag, false, part)}`);
						this.loadingParts = false;
						return Promise.resolve(null);
					}
					if (!this.filterReplacedPrimary(part, level.details)) return Promise.resolve(null);
					const _keyLoadingPromise = this.loadKeyFor(frag, details);
					if (this.fragContextChanged(frag)) return Promise.resolve(null);
					this.log(`Loading ${frag.type} sn: ${frag.sn} part: ${part.index} (${partIndex}/${partList.length - 1}) of ${this.fragInfo(frag, false, part)} cc: ${frag.cc} [${details.startSN}-${details.endSN}], target: ${targetBufferTime}${part.byteRange.length ? ` range:${part.byteRange.join("-")}` : ""}`);
					this.nextLoadPosition = part.start + part.duration;
					this.state = State.FRAG_LOADING;
					let _result;
					const _initDataPromise = this.loadInitSegmentIfNeeded(frag);
					if (_keyLoadingPromise || _initDataPromise) {
						const useKeyLoader = !!_keyLoadingPromise;
						_result = Promise.all([_keyLoadingPromise, _initDataPromise]).then(([keyLoadedData]) => {
							if (useKeyLoader && (!keyLoadedData || this.fragContextChanged(keyLoadedData.frag))) return null;
							return this.doFragPartsLoad(frag, part, level, progressCallback);
						}).catch((error) => this.handleFragLoadError(error, frag));
					} else _result = this.doFragPartsLoad(frag, part, level, progressCallback).catch((error) => this.handleFragLoadError(error, frag));
					this.hls.trigger(Events.FRAG_LOADING, {
						frag,
						part,
						targetBufferTime
					});
					if (this.fragCurrent === null) return Promise.reject(/* @__PURE__ */ new Error(`frag load aborted, context changed in FRAG_LOADING parts`));
					return _result;
				} else if (!frag.url || this.loadedEndOfParts(partList, targetBufferTime)) return Promise.resolve(null);
			}
		}
		if (this.loadingParts) {
			var _details$partList;
			this.log(`LL-Part loading OFF after next part miss @${targetBufferTime} Check buffer at sn: ${frag.sn} loaded parts: ${(_details$partList = details.partList) == null ? void 0 : _details$partList.filter((p) => p.loaded).map((p) => `[${p.start}-${p.end}]`)}`);
			this.loadingParts = false;
		} else if (!frag.url) return Promise.resolve(null);
		if (!this.filterReplacedPrimary(frag, level.details)) return Promise.resolve(null);
		const initDataPromise = this.loadInitSegmentIfNeeded(frag);
		const keyLoadingPromise = this.loadKeyFor(frag, details, initDataPromise);
		if (this.fragContextChanged(frag)) {
			var _this$fragCurrent2;
			this.log(`Context changed in KEY_LOADING sn: ${frag.sn} ${frag.relurl} > ${(_this$fragCurrent2 = this.fragCurrent) == null ? void 0 : _this$fragCurrent2.relurl}`);
			initDataPromise?.catch(() => null);
			keyLoadingPromise?.catch(() => null);
			return Promise.resolve(null);
		}
		this.log(`Loading ${frag.type} sn: ${frag.sn} of ${this.fragInfo(frag, false)} cc: ${frag.cc} ${"[" + details.startSN + "-" + details.endSN + "]"}, target: ${targetBufferTime}${frag.byteRange.length ? ` range:${frag.byteRange.join("-")}` : ""}`);
		if (isFiniteNumber(frag.sn) && !this.bitrateTest) this.nextLoadPosition = frag.start + frag.duration;
		this.state = State.FRAG_LOADING;
		const dataOnProgress = this.config.progressive && frag.type !== PlaylistLevelType.SUBTITLE;
		let result;
		if (dataOnProgress && keyLoadingPromise) result = keyLoadingPromise.then((keyLoadedData) => {
			if (!keyLoadedData || this.fragContextChanged(keyLoadedData.frag)) return null;
			return this.fragmentLoader.load(frag, this.iframesOnly, progressCallback, initDataPromise);
		}).catch((error) => this.handleFragLoadError(error, frag));
		else result = Promise.all([
			this.fragmentLoader.load(frag, this.iframesOnly, dataOnProgress ? progressCallback : void 0, dataOnProgress ? initDataPromise : void 0),
			keyLoadingPromise,
			initDataPromise
		]).then(([fragLoadedData]) => {
			if (!dataOnProgress && progressCallback) progressCallback(fragLoadedData);
			return fragLoadedData;
		}).catch((error) => this.handleFragLoadError(error, frag));
		this.hls.trigger(Events.FRAG_LOADING, {
			frag,
			targetBufferTime
		});
		if (this.fragCurrent === null) return Promise.reject(/* @__PURE__ */ new Error(`frag load aborted, context changed in FRAG_LOADING`));
		return Promise.all([result, initDataPromise]).then(([fragData]) => fragData);
	}
	doFragPartsLoad(frag, fromPart, level, progressCallback) {
		return new Promise((resolve, reject) => {
			var _level$details;
			const partsLoaded = [];
			const initialPartList = (_level$details = level.details) == null ? void 0 : _level$details.partList;
			const loadPart = (part) => {
				this.fragmentLoader.loadPart(frag, part, progressCallback).then((partLoadedData) => {
					partsLoaded[part.index] = partLoadedData;
					const loadedPart = partLoadedData.part;
					this.hls.trigger(Events.FRAG_LOADED, partLoadedData);
					const nextPart = getPartWith(level.details, frag.sn, part.index + 1) || findPart(initialPartList, frag.sn, part.index + 1);
					if (nextPart) loadPart(nextPart);
					else return resolve({
						frag,
						part: loadedPart,
						partsLoaded
					});
				}).catch(reject);
			};
			loadPart(fromPart);
		});
	}
	handleFragLoadError(error, frag) {
		if ("data" in error) {
			const data = error.data;
			if (data.details === ErrorDetails.INTERNAL_ABORTED) this.handleFragLoadAborted(frag, data.part);
			else if (data.type === ErrorTypes.KEY_SYSTEM_ERROR && !data.fatal) {
				frag.abortRequests();
				this.resetStartWhenNotLoaded();
				this.resetFragmentLoading(frag);
			}
			if (data.frag !== frag) {
				if (data.frag) this.warn(`${data.details} error cascading from ${this.fragInfo(data.frag, false, data.part)} to ${this.fragInfo(frag, false)}`);
				this.hls.trigger(Events.ERROR, _objectSpread2(_objectSpread2({}, data), {}, { frag }));
			} else this.hls.trigger(Events.ERROR, data);
		} else this.hls.trigger(Events.ERROR, {
			type: ErrorTypes.OTHER_ERROR,
			details: ErrorDetails.INTERNAL_EXCEPTION,
			err: error,
			error,
			fatal: true
		});
		return null;
	}
	_handleTransmuxerFlush(chunkMeta) {
		const context = this.getCurrentContext(chunkMeta);
		if (!context || this.state !== State.PARSING) {
			if (!this.fragCurrent && this.state !== State.STOPPED && this.state !== State.ERROR) this.state = State.IDLE;
			return;
		}
		const { frag, part, level } = context;
		const now = self.performance.now();
		frag.stats.parsing.end = now;
		if (part) part.stats.parsing.end = now;
		const levelDetails = this.getLevelDetails();
		const shouldLoadParts = levelDetails && frag.sn > levelDetails.endSN || this.shouldLoadParts(levelDetails, frag.end);
		if (shouldLoadParts !== this.loadingParts) {
			this.log(`LL-Part loading ${shouldLoadParts ? "ON" : "OFF"} after parsing segment ending @${frag.end}`);
			this.loadingParts = shouldLoadParts;
		}
		this.updateLevelTiming(frag, part, level, chunkMeta);
	}
	shouldLoadParts(details, bufferEnd) {
		if (this.config.lowLatencyMode) {
			if (!details) return this.loadingParts;
			if (details.partList && !this.iframesOnly) {
				var _details$fragmentHint;
				const firstPart = details.partList[0];
				if (bufferEnd >= firstPart.end + (((_details$fragmentHint = details.fragmentHint) == null ? void 0 : _details$fragmentHint.duration) || 0)) {
					if (this.playhead > firstPart.start - firstPart.fragment.duration) return true;
				}
			}
		}
		return false;
	}
	getCurrentContext(chunkMeta) {
		const { levels, fragCurrent } = this;
		const { level: levelIndex, sn, part: partIndex } = chunkMeta;
		if (!(levels != null && levels[levelIndex])) {
			this.warn(`Levels object was unset while buffering fragment ${sn} of ${this.playlistLabel()} ${levelIndex}. The current chunk will not be buffered.`);
			return null;
		}
		const level = levels[levelIndex];
		const levelDetails = level.details;
		const part = partIndex > -1 ? getPartWith(levelDetails, sn, partIndex) : null;
		const frag = part ? part.fragment : getFragmentWithSN(levelDetails, sn, fragCurrent);
		if (!frag) return null;
		if (fragCurrent && fragCurrent !== frag) frag.stats = fragCurrent.stats;
		return {
			frag,
			part,
			level
		};
	}
	bufferFragmentData(data, frag, part, chunkMeta, noBacktracking) {
		if (this.state !== State.PARSING) return;
		if (isMediaFragment(frag) && !this.fragContextChanged(frag)) this.fragPrevious = frag;
		const { data1, data2 } = data;
		let buffer = data1;
		if (data2) buffer = appendUint8Array(data1, data2);
		if (!buffer.length) return;
		const offsetTimestamp = this.initPTS[frag.cc];
		const offset = offsetTimestamp ? -offsetTimestamp.baseTime / offsetTimestamp.timescale : void 0;
		const segment = {
			type: data.type,
			frag,
			part,
			chunkMeta,
			offset,
			parent: frag.type,
			data: buffer
		};
		this.hls.trigger(Events.BUFFER_APPENDING, segment);
		if (data.dropped && data.independent && !part) {
			if (noBacktracking) return;
			this.flushBufferGap(frag);
		}
	}
	flushBufferGap(frag) {
		const media = this.media;
		if (!media) return;
		if (!BufferHelper.isBuffered(media, media.currentTime)) {
			this.flushMainBuffer(0, frag.start);
			return;
		}
		const currentTime = media.currentTime;
		const bufferInfo = BufferHelper.bufferInfo(media, currentTime, 0);
		const fragDuration = frag.duration;
		const segmentFraction = Math.min(this.config.maxFragLookUpTolerance * 2, fragDuration * .25);
		const start = Math.max(Math.min(frag.start - segmentFraction, bufferInfo.end - segmentFraction), currentTime + segmentFraction);
		if (frag.start - start > segmentFraction) this.flushMainBuffer(start, frag.start);
	}
	getFwdBufferInfo(bufferable, type) {
		var _this$media;
		const pos = this.playhead;
		const maxBufferHole = this.lastCurrentTime > pos || (_this$media = this.media) != null && _this$media.paused ? 0 : this.config.maxBufferHole;
		return this.getFwdBufferInfoAtPos(bufferable, pos, type, maxBufferHole);
	}
	getFwdBufferInfoAtPos(bufferable, pos, type, maxBufferHole) {
		const bufferInfo = BufferHelper.bufferInfo(bufferable, pos, maxBufferHole);
		if (bufferInfo.len === 0 && bufferInfo.nextStart !== void 0) {
			const bufferedFragAtPos = this.fragmentTracker.getBufferedFrag(pos, type);
			if (bufferedFragAtPos && (bufferInfo.nextStart <= bufferedFragAtPos.end || bufferedFragAtPos.gap)) {
				const gapDuration = Math.max(Math.min(bufferInfo.nextStart, bufferedFragAtPos.end) - pos, maxBufferHole);
				return BufferHelper.bufferInfo(bufferable, pos, gapDuration);
			}
		}
		return bufferInfo;
	}
	getMaxBufferLength(levelBitrate) {
		const { config } = this;
		let maxBufLen;
		if (levelBitrate) maxBufLen = Math.max(8 * config.maxBufferSize / levelBitrate, config.maxBufferLength);
		else maxBufLen = config.maxBufferLength;
		return Math.min(maxBufLen, config.maxMaxBufferLength);
	}
	exceedsMaxBuffer(bufferInfo, maxBufLen, selected) {
		const nextStart = bufferInfo.nextStart;
		if (nextStart && selected.start > nextStart) {
			const bufferedRanges = bufferInfo.buffered;
			if (bufferedRanges) {
				let fullBufferLength = bufferInfo.len;
				const bufferedIndex = bufferInfo.bufferedIndex;
				for (let i = bufferedRanges.length - 1; i > bufferedIndex; i--) if (bufferedRanges[i].start < selected.start) fullBufferLength += bufferedRanges[i].end - bufferedRanges[i].start;
				return fullBufferLength >= maxBufLen;
			}
		}
		return false;
	}
	reduceMaxBufferLength(threshold, fragDuration) {
		const config = this.config;
		const minLength = Math.max(Math.min(threshold - fragDuration, config.maxBufferLength), fragDuration / 2);
		const reducedLength = Math.max(threshold - fragDuration * 3, config.maxMaxBufferLength / 2, minLength);
		if (reducedLength >= minLength) {
			config.maxMaxBufferLength = reducedLength;
			this.warn(`Reduce max buffer length to ${reducedLength}s`);
			return true;
		}
		return false;
	}
	getAppendedFrag(position) {
		const fragOrPart = this.fragmentTracker ? this.fragmentTracker.getAppendedFrag(position, this.playlistType) : null;
		if (fragOrPart && "fragment" in fragOrPart) return fragOrPart.fragment;
		return fragOrPart;
	}
	getNextFragment(pos, levelDetails) {
		const fragments = levelDetails.fragments;
		const fragLen = fragments.length;
		if (!fragLen) return null;
		const { config } = this;
		const playlistStart = levelDetails.fragmentStart;
		const canLoadParts = config.lowLatencyMode && !!levelDetails.partList;
		let frag = null;
		if (levelDetails.live) {
			const initialLiveManifestSize = config.initialLiveManifestSize;
			if (fragLen < initialLiveManifestSize) {
				this.warn(`Not enough fragments to start playback (have: ${fragLen}, need: ${initialLiveManifestSize})`);
				return null;
			}
			if (!this.startFragRequested && canLoadParts && !this.loadingParts) {
				this.log(`LL-Part loading ON for initial live fragment`);
				this.loadingParts = true;
			}
			if (!levelDetails.PTSKnown && !this.startFragRequested && this.startPosition === -1 || pos < playlistStart) {
				var _frag;
				frag = this.getInitialLiveFragment(levelDetails);
				const configValue = this.config.startPosition;
				const mainStart = this.hls.startPosition;
				const liveSyncPosition = this.hls.liveSyncPosition;
				const fragStart = ((_frag = frag) == null ? void 0 : _frag.start) || 0;
				let startPosition;
				let reason;
				if (mainStart !== -1 && mainStart >= playlistStart) {
					startPosition = mainStart;
					reason = mainStart === configValue ? "config" : "next load start";
				} else if (liveSyncPosition) {
					startPosition = liveSyncPosition;
					reason = "live edge";
				} else {
					startPosition = pos;
					reason = "buffer pos";
				}
				if (startPosition < fragStart) {
					startPosition = fragStart;
					reason = "live frag start";
				}
				if (startPosition < playlistStart) {
					startPosition = playlistStart;
					reason = "playlist start";
				}
				if (this.startPosition != startPosition || this.nextLoadPosition != startPosition) {
					const tmpStartPosition = levelDetails.live && !this.filterReplacedPrimary(frag, levelDetails) ? -1 : startPosition;
					this.log(`Setting startPosition to ${tmpStartPosition} next load ${startPosition} ${mainStart === -1 ? "" : `(from ${configValue}) `}based on ${reason}. live edge: ${liveSyncPosition} live frag start: ${fragStart} playlist start: ${playlistStart} buffer pos: ${pos}`);
					this.startPosition = tmpStartPosition;
					this.nextLoadPosition = startPosition;
				}
			}
		} else if (pos <= playlistStart) frag = fragments[0];
		if (!frag) {
			const end = this.loadingParts ? levelDetails.partEnd : levelDetails.fragmentEnd;
			frag = this.getFragmentAtPosition(pos, end, levelDetails);
		}
		let programFrag = this.filterReplacedPrimary(frag, levelDetails);
		if (!programFrag && frag) {
			programFrag = getNextFrag(levelDetails, frag.sn);
			if (programFrag) this.nextLoadPosition = programFrag.start;
		}
		return programFrag;
	}
	isLoopLoading(frag, targetBufferTime) {
		if (this.nextLoadPosition <= targetBufferTime) return false;
		const trackerState = this.fragmentTracker.getState(frag);
		if (trackerState === FragmentState.OK) return true;
		if (trackerState === FragmentState.PARTIAL) {
			if (frag.gap) return true;
			if (frag.stats.retry > 1) return true;
		}
		return false;
	}
	getNextFragmentLoopLoading(frag, levelDetails, bufferInfo, playlistType, maxBufLen) {
		let nextFragment = null;
		if (frag.gap) {
			nextFragment = this.getNextFragment(this.nextLoadPosition, levelDetails);
			if (nextFragment && !nextFragment.gap && bufferInfo.nextStart) {
				const nextbufferInfo = this.getFwdBufferInfoAtPos(this.mediaBuffer ? this.mediaBuffer : this.media, bufferInfo.nextStart, playlistType, 0);
				if (nextbufferInfo !== null && bufferInfo.len + nextbufferInfo.len >= maxBufLen) {
					const sn = nextFragment.sn;
					if (this.loopSn !== sn) {
						this.log(`buffer full after gaps in "${playlistType}" playlist starting at sn: ${sn}`);
						this.loopSn = sn;
					}
					return null;
				}
			}
		}
		this.loopSn = void 0;
		return nextFragment;
	}
	get primaryPrefetch() {
		if (interstitialsEnabled(this.config));
		return false;
	}
	filterReplacedPrimary(frag, details) {
		if (!frag) return frag;
		if (interstitialsEnabled(this.config));
		return frag;
	}
	getNextPart(partList, frag, targetBufferTime) {
		let nextPart = -1;
		let contiguous = false;
		let independentAttrOmitted = true;
		for (let i = 0, len = partList.length; i < len; i++) {
			const _part = partList[i];
			independentAttrOmitted = independentAttrOmitted && !_part.independent;
			if (nextPart > -1 && targetBufferTime < _part.start) break;
			const loaded = _part.loaded || _part.gap;
			if (loaded) nextPart = -1;
			else if (contiguous || (_part.independent || independentAttrOmitted) && _part.fragment === frag) nextPart = i;
			contiguous = loaded && !_part.gap;
		}
		const part = partList[nextPart];
		if (part && part.fragment !== frag) this.log(`Need buffer at ${targetBufferTime} but next unloaded part starts at ${part.start} (sn: ${frag.sn} -> ${part.fragment.sn})`);
		return nextPart;
	}
	loadedEndOfParts(partList, targetBufferTime) {
		let part;
		for (let i = partList.length; i--;) {
			part = partList[i];
			if (!part.loaded) return false;
			if (targetBufferTime > part.start) return true;
		}
		return false;
	}
	getInitialLiveFragment(levelDetails) {
		const fragments = levelDetails.fragments;
		const fragPrevious = this.fragPrevious;
		let frag = null;
		if (fragPrevious) {
			if (levelDetails.hasProgramDateTime) {
				frag = findFragmentByPDT(fragments, fragPrevious.endProgramDateTime, this.config.maxFragLookUpTolerance);
				if (frag) this.log(`Live playlist, switching playlist, load frag with same PDT: ${fragPrevious.programDateTime}`);
			}
			if (!frag) {
				const targetSN = fragPrevious.sn + 1;
				if (targetSN >= levelDetails.startSN && targetSN <= levelDetails.endSN) {
					const fragNext = fragments[targetSN - levelDetails.startSN];
					if (fragPrevious.cc === fragNext.cc) {
						frag = fragNext;
						this.log(`Live playlist, switching playlist, load frag with next SN: ${frag.sn}`);
					}
				}
				if (!frag) {
					frag = findNearestWithCC(levelDetails, fragPrevious.cc, fragPrevious.end);
					if (frag) this.log(`Live playlist, switching playlist, load frag with same CC: ${frag.sn}`);
				}
			}
		} else {
			const liveStart = this.hls.liveSyncPosition;
			if (liveStart !== null) frag = this.getFragmentAtPosition(liveStart, this.bitrateTest ? levelDetails.fragmentEnd : levelDetails.edge, levelDetails);
		}
		return frag;
	}
	getFragmentAtPosition(bufferEnd, end, levelDetails) {
		const { config } = this;
		let { fragPrevious } = this;
		let { fragments, endSN } = levelDetails;
		const { fragmentHint } = levelDetails;
		const { maxFragLookUpTolerance } = config;
		const partList = levelDetails.partList;
		const loadingParts = !!(this.loadingParts && partList != null && partList.length && fragmentHint);
		if (loadingParts && !this.bitrateTest && partList[partList.length - 1].fragment.sn === fragmentHint.sn) {
			fragments = fragments.concat(fragmentHint);
			endSN = fragmentHint.sn;
		}
		if (fragPrevious && this.fragmentTracker.getState(fragPrevious) === FragmentState.NOT_LOADED) fragPrevious = null;
		let frag;
		if (bufferEnd < end) {
			var _this$media2;
			const lookupTolerance = bufferEnd < this.lastCurrentTime || bufferEnd > end - maxFragLookUpTolerance || (_this$media2 = this.media) != null && _this$media2.paused || this.loadingParts || !this.startFragRequested ? 0 : maxFragLookUpTolerance;
			frag = findFragmentByPTS(fragPrevious, fragments, bufferEnd, lookupTolerance);
		} else frag = fragments[fragments.length - 1];
		if (frag) {
			const fragSn = frag.sn;
			const curSNIdx = fragSn - levelDetails.startSN;
			const fragState = this.fragmentTracker.getState(frag);
			if (fragState === FragmentState.OK || fragState === FragmentState.PARTIAL && frag.gap) fragPrevious = frag;
			if (mediaFragmentsAreEqual(frag, fragPrevious) && (!loadingParts || partList[0].fragment.sn > fragSn || !levelDetails.live || !partList.some((part) => part.fragment.sn === fragSn && !part.loaded && !part.gap))) {
				const nextFrag = fragments[curSNIdx + 1];
				if (frag.sn < endSN && this.fragmentTracker.getState(nextFrag) !== FragmentState.OK) frag = nextFrag;
				else frag = null;
			}
		}
		return frag;
	}
	alignPlaylists(details, previousDetails, switchDetails) {
		const length = details.fragments.length;
		if (!length) {
			this.warn(`No fragments in live playlist`);
			return 0;
		}
		const slidingStart = details.fragmentStart;
		const firstLevelLoad = !previousDetails;
		const aligned = details.alignedSliding && isFiniteNumber(slidingStart);
		if (firstLevelLoad || !aligned && !slidingStart) {
			alignStream(switchDetails, details, this);
			const alignedSlidingStart = details.fragmentStart;
			this.log(`Live playlist sliding: ${alignedSlidingStart} start-sn: ${previousDetails ? previousDetails.startSN : "na"}->${details.startSN} fragments: ${length}`);
			return alignedSlidingStart;
		}
		return slidingStart;
	}
	waitForCdnTuneIn(details) {
		return details.live && details.canBlockReload && details.partTarget && details.tuneInGoal > Math.max(details.partHoldBack, details.partTarget * 3);
	}
	setStartPosition(details, sliding) {
		let startPosition = this.startPosition;
		if (startPosition < sliding) startPosition = -1;
		const timelineOffset = this.timelineOffset;
		if (startPosition === -1) {
			const offsetInMultivariantPlaylist = this.startTimeOffset !== null;
			const startTimeOffset = offsetInMultivariantPlaylist ? this.startTimeOffset : details.startTimeOffset;
			if (startTimeOffset !== null && isFiniteNumber(startTimeOffset)) {
				startPosition = sliding + startTimeOffset;
				if (startTimeOffset < 0) startPosition += details.edge;
				startPosition = Math.min(Math.max(sliding, startPosition), sliding + details.totalduration);
				this.log(`Setting startPosition to ${startPosition} for start time offset ${startTimeOffset} found in ${offsetInMultivariantPlaylist ? "multivariant" : "media"} playlist`);
				this.startPosition = startPosition;
			} else if (details.live) {
				const liveSyncPosition = this.hls.liveSyncPosition;
				startPosition = liveSyncPosition || sliding;
				this.log(`Setting startPosition to -1 to start at ${liveSyncPosition ? "live edge" : "playlist start"} ${startPosition}`);
				this.startPosition = -1;
			} else {
				this.log(`setting startPosition to 0 by default`);
				this.startPosition = startPosition = 0;
			}
			this.lastCurrentTime = startPosition + timelineOffset;
		}
		this.nextLoadPosition = startPosition + timelineOffset;
	}
	getLoadPosition() {
		var _this$hls2;
		const { media } = this;
		let pos = 0;
		if ((_this$hls2 = this.hls) != null && _this$hls2.hasEnoughToStart && media && !this.iframesOnly) pos = media.currentTime;
		else if (this.nextLoadPosition >= 0) pos = this.nextLoadPosition;
		return pos;
	}
	get playhead() {
		var _this$hls3;
		if ((_this$hls3 = this.hls) != null && _this$hls3.hasEnoughToStart) {
			var _this$media3;
			const currentTime = (_this$media3 = this.media) == null ? void 0 : _this$media3.currentTime;
			if (isFiniteNumber(currentTime)) return currentTime;
			return this.lastCurrentTime;
		}
		return this.getLoadPosition();
	}
	get iframesOnly() {
		var _this$levelLastLoaded;
		if (this.playlistType !== PlaylistLevelType.MAIN) return false;
		const details = this.getLevelDetails();
		if (details) return details.iframesOnly;
		return (_this$levelLastLoaded = this.levelLastLoaded) == null ? void 0 : _this$levelLastLoaded.iframes;
	}
	handleFragLoadAborted(frag, part) {
		if (this.transmuxer && frag.type === this.playlistType && isMediaFragment(frag) && frag.stats.aborted) {
			this.log(`Fragment ${frag.sn}${part ? " part " + part.index : ""} of ${this.playlistLabel()} ${frag.level} was aborted`);
			this.resetFragmentLoading(frag);
		}
	}
	resetFragmentLoading(frag) {
		if (this.state === State.STOPPED) return;
		if (!this.fragCurrent || !this.fragContextChanged(frag) && this.state !== State.FRAG_LOADING_WAITING_RETRY) this.state = State.IDLE;
	}
	onFragmentOrKeyLoadError(filterType, data) {
		if (data.chunkMeta && !data.frag) {
			const context = this.getCurrentContext(data.chunkMeta);
			if (context) data.frag = context.frag;
		}
		const { frag, part } = data;
		if (!frag || !this.levels || frag.type !== filterType) return;
		if (this.fragContextChanged(frag)) {
			var _this$fragCurrent3;
			this.warn(`Frag load error must match current frag to retry ${frag.relurl} > ${(_this$fragCurrent3 = this.fragCurrent) == null ? void 0 : _this$fragCurrent3.relurl}`);
			return;
		}
		const gapTagEncountered = data.details === ErrorDetails.FRAG_GAP;
		if (gapTagEncountered) this.fragmentTracker.addAsGap(frag);
		const errorAction = data.errorAction;
		if (!errorAction) {
			this.state = State.ERROR;
			return;
		}
		const { action, flags, retryCount = 0, retryConfig } = errorAction;
		const couldRetry = !!retryConfig;
		const retry = couldRetry && action === NetworkErrorAction.RetryRequest;
		const noAlternate = couldRetry && !errorAction.resolved && flags & ErrorActionFlags.MoveAllAlternatesMatchingHost;
		const levelDetails = this.hls.latestLevelDetails;
		const live = levelDetails == null ? void 0 : levelDetails.live;
		if (!retry && noAlternate && isMediaFragment(frag) && live && frag.sn < levelDetails.endSN && !isUnusableKeyError(data)) {
			this.resetFragmentErrors(filterType);
			if (part) part.gap = true;
			else this.treatAsGap(frag);
			errorAction.resolved = true;
		} else if ((retry || noAlternate) && retryCount < retryConfig.maxNumRetry) {
			var _data$response;
			const offlineStatus = offlineHttpStatus((_data$response = data.response) == null ? void 0 : _data$response.code);
			const delay = getRetryDelay(retryConfig, retryCount);
			this.resetStartWhenNotLoaded();
			this.retryDate = self.performance.now() + delay;
			this.state = State.FRAG_LOADING_WAITING_RETRY;
			errorAction.resolved = true;
			if (offlineStatus) {
				this.log(`Waiting for connection (offline)`);
				this.retryDate = Infinity;
				data.reason = "offline";
				return;
			}
			this.warn(`Fragment ${frag.sn} of ${filterType} ${frag.level} errored with ${data.details}, retrying loading ${retryCount + 1}/${retryConfig.maxNumRetry} in ${delay}ms`);
		} else if (retryConfig) {
			this.resetFragmentErrors(filterType);
			if (retryCount < retryConfig.maxNumRetry) {
				if (!gapTagEncountered && action !== NetworkErrorAction.RemoveAlternatePermanently) errorAction.resolved = true;
			} else {
				this.warn(`${data.details} reached or exceeded max retry (${retryCount})`);
				return;
			}
		} else if (action === NetworkErrorAction.SendAlternateToPenaltyBox) this.state = State.WAITING_LEVEL;
		else this.state = State.ERROR;
		this.tickImmediate();
	}
	onSourceBufferError(filterType, data) {
		var _this$levels2, _refused$elementarySt;
		const { frag, part, sourceBufferName } = data;
		const details = frag && ((_this$levels2 = this.levels) == null || (_this$levels2 = _this$levels2[frag.level]) == null ? void 0 : _this$levels2.details);
		if (data.error.name !== SOURCE_BUFFER_ERROR_NAME || (frag == null ? void 0 : frag.type) !== filterType || !isMediaFragment(frag) || !(details != null && details.live)) return;
		const refused = part ? part.index === 0 ? part : null : frag;
		const start = refused && sourceBufferName ? (_refused$elementarySt = refused.elementaryStreams[sourceBufferName]) == null ? void 0 : _refused$elementarySt.startPTS : void 0;
		this.markSourceBufferErrorGap(getFragmentWithSN(details, frag.sn) || frag);
		if (start === void 0) return;
		const previous = getFragmentWithSN(details, frag.sn - 1);
		if (previous && this.fragmentTracker.getState(previous) !== FragmentState.NOT_LOADED && !BufferHelper.isBuffered(this.mediaBuffer || this.media, start - this.config.maxBufferHole)) this.markSourceBufferErrorGap(previous);
	}
	markSourceBufferErrorGap(frag) {
		this.warn(`Marking fragment ${frag.sn} of ${this.playlistLabel()} ${frag.level} as a gap after a SourceBuffer error`);
		this.fragmentTracker.addAsGap(frag);
	}
	checkRetryDate() {
		const now = self.performance.now();
		const retryDate = this.retryDate;
		const waitingForConnection = retryDate === Infinity;
		if (!retryDate || now >= retryDate || waitingForConnection && !offlineHttpStatus(0)) {
			if (waitingForConnection) this.log(`Connection restored (online)`);
			this.resetStartWhenNotLoaded();
			this.state = State.IDLE;
		}
	}
	reduceLengthAndFlushBuffer(data) {
		if (this.state === State.PARSING || this.state === State.PARSED) {
			const frag = data.frag;
			const playlistType = data.parent;
			const bufferedInfo = this.getFwdBufferInfo(this.mediaBuffer, playlistType);
			const buffered = bufferedInfo && bufferedInfo.len > .5;
			if (buffered) this.reduceMaxBufferLength(bufferedInfo.len, (frag == null ? void 0 : frag.duration) || 10);
			const flushBuffer = !buffered;
			if (flushBuffer) this.warn(`Buffer full error while media.currentTime (${this.playhead}) is not buffered, flush ${playlistType} buffer`);
			else if (bufferedInfo.nextStart && frag && bufferedInfo.nextStart > frag.start) this.flushMainBuffer(bufferedInfo.nextStart, Number.POSITIVE_INFINITY, playlistType === PlaylistLevelType.AUDIO ? playlistType : void 0);
			if (frag) {
				this.fragmentTracker.removeFragment(frag);
				this.nextLoadPosition = frag.start;
			}
			this.resetLoadingState();
			return flushBuffer;
		}
		return false;
	}
	resetFragmentErrors(filterType) {
		if (filterType === PlaylistLevelType.AUDIO) this.fragCurrent = null;
		if (!this.hls.hasEnoughToStart) this.startFragRequested = false;
		if (this.state !== State.STOPPED) this.state = State.IDLE;
	}
	afterBufferFlushed(media, bufferType) {
		if (!media) return;
		const bufferedTimeRanges = BufferHelper.getBuffered(media);
		this.fragmentTracker.detectEvictedFragments(bufferType, bufferedTimeRanges, this.playlistType);
		if (this.state === State.ENDED) this.resetLoadingState();
	}
	resetLoadingState() {
		this.log("Reset loading state");
		this.fragCurrent = null;
		this.fragPrevious = null;
		if (this.state !== State.STOPPED) this.state = State.IDLE;
	}
	resetStartWhenNotLoaded() {
		if (!this.hls.hasEnoughToStart) {
			this.startFragRequested = false;
			const details = this.getLevelDetails();
			if (details != null && details.live) {
				this.log(`resetting startPosition for live start`);
				this.startPosition = -1;
				this.setStartPosition(details, details.fragmentStart);
				this.resetLoadingState();
			} else this.nextLoadPosition = this.startPosition;
		}
	}
	resetWhenMissingContext(chunkMeta) {
		this.log(`Loading context changed while buffering sn ${chunkMeta.sn} of ${this.playlistLabel()} ${chunkMeta.level === -1 ? "<removed>" : chunkMeta.level}. This chunk will not be buffered.`);
		this.removeUnbufferedFrags();
		this.resetStartWhenNotLoaded();
		this.resetLoadingState();
	}
	removeUnbufferedFrags(start = 0) {
		this.fragmentTracker.removeFragmentsInRange(start, Infinity, this.playlistType, false, true);
	}
	updateLevelTiming(frag, part, level, chunkMeta) {
		const details = level.details;
		if (!details) {
			this.warn("level.details undefined");
			return;
		}
		this.log(`update level timing ${frag.type} sn: ${frag.sn}${part ? " part: " + part.index : ""} of ${this.fragInfo(frag, false, part)}`);
		if (!Object.keys(frag.elementaryStreams).reduce((result, type) => {
			const info = frag.elementaryStreams[type];
			if (info) {
				const parsedDuration = info.endPTS - info.startPTS;
				if (parsedDuration <= 0) {
					this.warn(`Could not parse fragment ${frag.sn} ${type} duration reliably (${parsedDuration})`);
					return result || false;
				}
				let drift = 0;
				if (chunkMeta.partial) {
					if (part && chunkMeta.part === 0) {
						drift = part.start - info.startPTS;
						frag.startPTS = frag.maxStartPTS = info.startPTS;
						frag.startDTS = info.startDTS;
						if (frag.start !== 0) frag.setStart(info.startPTS);
						alignSliding(details, frag, drift);
					}
				} else drift = updateFragPTSDTS(details, frag, info.startPTS, info.endPTS, info.startDTS, info.endDTS, this.iframesOnly, this);
				this.hls.trigger(Events.LEVEL_PTS_UPDATED, {
					details,
					level,
					drift,
					type,
					frag,
					part,
					start: info.startPTS,
					end: info.endPTS
				});
				return true;
			}
			return result;
		}, false)) {
			var _this$transmuxer, _this$transmuxer2, _this$levels$length, _this$levels3;
			const mediaNotFound = ((_this$transmuxer = this.transmuxer) == null ? void 0 : _this$transmuxer.error) === null;
			const transmuxerError = ((_this$transmuxer2 = this.transmuxer) == null ? void 0 : _this$transmuxer2.error) != null;
			const hasAlternateLevels = ((_this$levels$length = (_this$levels3 = this.levels) == null ? void 0 : _this$levels3.length) != null ? _this$levels$length : 0) > 1;
			if (level.fragmentError === 0 || mediaNotFound && (level.fragmentError < 2 || frag.endList) || transmuxerError && hasAlternateLevels) this.treatAsGap(frag, level);
			if (mediaNotFound) {
				const error = /* @__PURE__ */ new Error(`Found no media in ${this.playlistLabel()} ${frag.level} ${part ? `part: ${part.index} of ` : ""}sn: ${frag.sn} at playlist time: ${frag.start}. Resetting transmuxer to fallback to playlist timing`);
				this.warn(error.message);
				this.hls.trigger(Events.ERROR, {
					type: ErrorTypes.MEDIA_ERROR,
					details: ErrorDetails.FRAG_PARSING_ERROR,
					fatal: false,
					error,
					frag,
					reason: `Found no media in msn ${frag.sn} of ${this.playlistLabel()} "${level.url}"`
				});
				if (!this.hls) return;
				this.resetTransmuxer();
			}
		}
		this.state = State.PARSED;
		this.log(`Parsed ${frag.type} sn: ${frag.sn}${part ? " part: " + part.index : ""} of ${this.fragInfo(frag, false, part)}`);
		this.hls.trigger(Events.FRAG_PARSED, {
			frag,
			part,
			chunkMeta
		});
	}
	playlistLabel() {
		return `${this.playlistType} playlist`;
	}
	fragInfo(frag, pts = true, part) {
		var _ref, _ref2;
		return `${frag.type} playlist ${frag.level} (${part ? "part" : "frag"}:[${(_ref = pts && !part ? frag.startPTS : (part || frag).start) != null ? _ref : NaN}-${(_ref2 = pts && !part ? frag.endPTS : (part || frag).end) != null ? _ref2 : NaN}]${part && frag.type === "main" ? "INDEPENDENT=" + (part.independent ? "YES" : "NO") : ""})`;
	}
	treatAsGap(frag, level) {
		if (level) level.fragmentError++;
		this.fragmentTracker.addAsGap(frag);
	}
	resetTransmuxer() {
		var _this$transmuxer3;
		(_this$transmuxer3 = this.transmuxer) == null || _this$transmuxer3.reset();
	}
	isFragmentNearlyDownloaded(fragment) {
		var _fragment$loader;
		const stats = (_fragment$loader = fragment.loader) == null ? void 0 : _fragment$loader.stats;
		if (!stats) return false;
		if (stats.total <= 0) return false;
		const hasFirstByte = stats.loading.first > 0;
		const timeToCompleteFragDownload = (stats.total - stats.loaded) * 8 / (this.hls.bandwidthEstimate || this.hls.config.abrEwmaDefaultEstimate);
		return hasFirstByte && timeToCompleteFragDownload <= .15;
	}
	recoverWorkerError(data) {
		if (data.event === "demuxerWorker") {
			this.fragmentTracker.removeAllFragments();
			if (this.transmuxer) {
				this.transmuxer.destroy();
				this.transmuxer = null;
			}
			this.resetStartWhenNotLoaded();
			this.resetLoadingState();
		}
	}
	set state(nextState) {
		const previousState = this._state;
		if (previousState !== nextState) {
			this._state = nextState;
			this.log(`${previousState}->${nextState}`);
		}
	}
	get state() {
		return this._state;
	}
	/**
	* Calculate optimal switch point by considering fetch delays and buffer info
	* to avoid causing playback interruption
	*/
	calculateOptimalSwitchPoint(nextLevel, bufferInfo) {
		let fetchdelay = 0;
		const { hls, media, config, levels, playlistType } = this;
		const levelDetails = this.getLevelDetails();
		if (media && !media.paused && levels) {
			var _this$fragCurrent4;
			const maxBitrate = playlistType === PlaylistLevelType.AUDIO ? emptyEsExports.estimatedAudioBitrate(nextLevel.audioCodec, 128e3) : nextLevel.maxBitrate;
			const ttfbSec = 1 + hls.ttfbEstimate / 1e3;
			const bandwidth = hls.bandwidthEstimate * config.abrBandWidthUpFactor;
			fetchdelay = ttfbSec + maxBitrate * (levelDetails && (this.loadingParts ? levelDetails.partTarget : levelDetails.averagetargetduration) || ((_this$fragCurrent4 = this.fragCurrent) == null ? void 0 : _this$fragCurrent4.duration) || 6) / bandwidth;
			if (!nextLevel.details) fetchdelay += ttfbSec;
		}
		const currentTime = this.playhead;
		const okToFlushForwardBuffer = !(levelDetails != null && levelDetails.live) || bufferInfo.end - currentTime > fetchdelay * 1.5;
		return {
			fetchdelay,
			okToFlushForwardBuffer
		};
	}
	/**
	* Generic track switching scheduler that prevents buffering interruptions
	* by finding optimal flush points in the buffer
	* This method can be overridden by subclasses with specific implementation details
	*/
	scheduleTrackSwitch(bufferInfo, fetchdelay, okToFlushForwardBuffer) {
		const { media, playlistType } = this;
		if (!media || !bufferInfo) return;
		const bufferedFrag = okToFlushForwardBuffer ? this.getBufferedFrag(this.playhead + fetchdelay) : null;
		if (bufferedFrag) {
			const nextBufferedFrag = this.followingBufferedFrag(bufferedFrag);
			if (nextBufferedFrag) {
				var _this$getLevelDetails2;
				this.abortCurrentFrag();
				const maxStart = nextBufferedFrag.maxStartPTS ? nextBufferedFrag.maxStartPTS : nextBufferedFrag.start;
				const fragDuration = nextBufferedFrag.duration;
				const startOffset = Math.max(bufferedFrag.end, maxStart + Math.min(Math.max(fragDuration - this.config.maxFragLookUpTolerance, fragDuration * (this.couldBacktrack ? .5 : .125)), fragDuration * (this.couldBacktrack ? .75 : .25)));
				if ((((_this$getLevelDetails2 = this.getLevelDetails()) == null ? void 0 : _this$getLevelDetails2.fragmentStart) || 0) > startOffset) return;
				const bufferType = playlistType === PlaylistLevelType.MAIN ? null : "audio";
				this.flushMainBuffer(startOffset, Number.POSITIVE_INFINITY, bufferType);
				this.cleanupBackBuffer();
			}
		}
	}
	/**
	* Handle back-buffer cleanup during track switching
	*/
	cleanupBackBuffer() {
		const { media, playlistType } = this;
		if (!media) return;
		const fragPlayingCurrent = this.getAppendedFrag(this.playhead);
		if (fragPlayingCurrent && fragPlayingCurrent.start > 1) {
			const isAudio = playlistType === PlaylistLevelType.AUDIO;
			this.flushMainBuffer(0, fragPlayingCurrent.start - (isAudio ? 0 : 1), isAudio ? "audio" : null);
		}
	}
	/**
	* Gets buffered fragment at the specified position
	*/
	getBufferedFrag(position) {
		return this.fragmentTracker.getBufferedFrag(position, this.playlistType);
	}
	/**
	* Gets the next buffered fragment following the given fragment
	*/
	followingBufferedFrag(frag) {
		if (frag) return this.getBufferedFrag(frag.end + .5);
		return null;
	}
	/**
	* Aborts the current fragment loading and resets state
	* Can be overridden by subclasses for specific behavior
	*/
	abortCurrentFrag() {
		var _this$hls4;
		const fragCurrent = this.fragCurrent;
		this.fragCurrent = null;
		if (fragCurrent) {
			fragCurrent.abortRequests();
			this.fragmentTracker.removeFragment(fragCurrent);
		}
		switch (this.state) {
			case State.KEY_LOADING:
			case State.FRAG_LOADING:
			case State.FRAG_LOADING_WAITING_RETRY:
			case State.PARSING:
			case State.PARSED: this.state = State.IDLE;
		}
		this.nextLoadPosition = (_this$hls4 = this.hls) != null && _this$hls4.hasEnoughToStart ? this.playhead : this.lastCurrentTime;
	}
	checkFragPlaying() {
		const video = this.media;
		let fragPlayingCurrent = null;
		if (video && video.readyState > 1 && video.seeking === false) {
			const currentTime = video.currentTime;
			if (BufferHelper.isBuffered(video, currentTime)) fragPlayingCurrent = this.getAppendedFrag(currentTime);
			else if (BufferHelper.isBuffered(video, currentTime + .1)) fragPlayingCurrent = this.getAppendedFrag(currentTime + .1);
			if (fragPlayingCurrent) {
				this.backtrackFragment = void 0;
				if (!mediaFragmentsAreEqual(fragPlayingCurrent, this.fragPlaying)) {
					this.fragPlaying = fragPlayingCurrent;
					return true;
				}
			}
		}
		return false;
	}
	getBufferOutput() {
		return null;
	}
	/**
	* try to switch ASAP without breaking video playback:
	* in order to ensure smooth but quick level switching,
	* we need to find the next flushable buffer range
	* we should take into account new segment fetch time
	*/
	nextLevelSwitch() {
		const { levels, media, hls, config, playlistType } = this;
		if (media != null && media.readyState && levels && hls && config) {
			const bufferOutput = this.getBufferOutput();
			const bufferInfo = this.getFwdBufferInfo(bufferOutput, playlistType);
			if (!bufferInfo) return;
			const nextLevel = levels[playlistType === PlaylistLevelType.AUDIO ? hls.nextAudioTrack : hls.nextLoadLevel];
			const { fetchdelay, okToFlushForwardBuffer } = this.calculateOptimalSwitchPoint(nextLevel, bufferInfo);
			this.scheduleTrackSwitch(bufferInfo, fetchdelay, okToFlushForwardBuffer);
		}
		this.tickImmediate();
	}
};
function interstitialsEnabled(config) {
	return false;
}
var CapLevelController = class CapLevelController {
	constructor(hls) {
		this.hls = null;
		this.autoLevelCapping = void 0;
		this.media = void 0;
		this.restrictedLevels = void 0;
		this.timer = void 0;
		this.observer = void 0;
		this.clientRect = void 0;
		this.streamController = void 0;
		this.hls = hls;
		this.autoLevelCapping = Number.POSITIVE_INFINITY;
		this.media = null;
		this.restrictedLevels = [];
		this.clientRect = null;
		this.registerListeners();
	}
	setStreamController(streamController) {
		this.streamController = streamController;
	}
	destroy() {
		if (this.hls) this.unregisterListener();
		if (this.timer || this.observer) this.stopCapping();
		this.media = this.clientRect = this.hls = null;
		this.streamController = void 0;
	}
	registerListeners() {
		const { hls } = this;
		if (hls) {
			hls.on(Events.FPS_DROP_LEVEL_CAPPING, this.onFpsDropLevelCapping, this);
			hls.on(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
			hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
			hls.on(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
			hls.on(Events.BUFFER_CODECS, this.onBufferCodecs, this);
			hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
		}
	}
	unregisterListener() {
		const { hls } = this;
		if (hls) {
			hls.off(Events.FPS_DROP_LEVEL_CAPPING, this.onFpsDropLevelCapping, this);
			hls.off(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
			hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
			hls.off(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
			hls.off(Events.BUFFER_CODECS, this.onBufferCodecs, this);
			hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
		}
	}
	onFpsDropLevelCapping(event, data) {
		if (!this.hls) return;
		const level = this.hls.levels[data.droppedLevel];
		if (this.isLevelAllowed(level)) this.restrictedLevels.push({
			bitrate: level.bitrate,
			height: level.height,
			width: level.width
		});
	}
	onMediaAttaching(event, data) {
		const media = data.media;
		this.clientRect = null;
		if (!this.hls) return;
		if (media instanceof HTMLVideoElement) {
			this.media = media;
			if (this.hls.config.capLevelToPlayerSize) this.observe();
		} else this.media = null;
		if ((this.timer || this.observer) && this.hls.levels.length > 1) this.detectPlayerSize();
	}
	onManifestParsed(event, data) {
		this.restrictedLevels = [];
		if (data.video) this.startCapping();
		this.onLevelsUpdated();
	}
	onLevelsUpdated() {
		if (!this.hls) return;
		if ((this.timer || this.observer) && (isFiniteNumber(this.autoLevelCapping) || this.clientRect)) this.detectPlayerSize();
		else if (this.observer === void 0 && this.timer === void 0) {
			const levels = this.hls.levels;
			if (levels.length > 1 && levels.some((level) => !!level.videoCodec)) this.startCapping();
		}
	}
	onBufferCodecs(event, data) {
		if (data.video) this.startCapping();
	}
	onMediaDetaching() {
		this.stopCapping();
		this.media = null;
	}
	detectPlayerSize() {
		if (this.media) {
			if (this.mediaHeight <= 0 || this.mediaWidth <= 0 || !this.hls) {
				this.clientRect = null;
				return;
			}
			const levels = this.hls.levels;
			if (levels.length > 1) {
				const hls = this.hls;
				const maxLevel = this.getMaxLevel(levels.length - 1);
				if (maxLevel !== this.autoLevelCapping) hls.logger.log(`Setting autoLevelCapping to ${maxLevel}: ${levels[maxLevel].height}p@${levels[maxLevel].bitrate} for media ${this.mediaWidth}x${this.mediaHeight}`);
				hls.autoLevelCapping = maxLevel;
				if (hls.autoLevelEnabled && hls.autoLevelCapping > this.autoLevelCapping && this.streamController) this.streamController.nextLevelSwitch();
				this.autoLevelCapping = hls.autoLevelCapping;
			} else if (levels.length === 1) this.stopCapping();
		}
	}
	getMaxLevel(capLevelIndex) {
		if (!this.hls) return -1;
		const levels = this.hls.levels;
		if (!levels.length) return -1;
		const validLevels = levels.filter((level, index) => this.isLevelAllowed(level) && index <= capLevelIndex);
		if (!this.observer) this.clientRect = null;
		return CapLevelController.getMaxLevelByMediaSize(validLevels, this.mediaWidth, this.mediaHeight);
	}
	observe() {
		const ResizeObserver = self.ResizeObserver;
		if (ResizeObserver) this.observer = new ResizeObserver((entries) => {
			var _entries$;
			const bounds = (_entries$ = entries[0]) == null ? void 0 : _entries$.contentRect;
			if (bounds) {
				this.clientRect = bounds;
				this.detectPlayerSize();
			}
		});
		if (this.observer && this.media) this.observer.observe(this.media);
	}
	startCapping() {
		var _this$hls;
		if (this.timer || this.observer || !((_this$hls = this.hls) != null && _this$hls.config.capLevelToPlayerSize)) return;
		self.clearInterval(this.timer);
		this.timer = void 0;
		this.autoLevelCapping = Number.POSITIVE_INFINITY;
		this.observe();
		if (!this.observer) this.timer = self.setInterval(this.detectPlayerSize.bind(this), 1e3);
		this.detectPlayerSize();
	}
	stopCapping() {
		this.restrictedLevels = [];
		this.autoLevelCapping = Number.POSITIVE_INFINITY;
		if (this.timer) {
			self.clearInterval(this.timer);
			this.timer = void 0;
		}
		if (this.observer) {
			this.observer.disconnect();
			this.observer = void 0;
		}
	}
	getDimensions() {
		if (this.clientRect) return this.clientRect;
		const media = this.media;
		const boundsRect = {
			width: 0,
			height: 0
		};
		if (media) {
			const clientRect = media.getBoundingClientRect();
			boundsRect.width = clientRect.width;
			boundsRect.height = clientRect.height;
			if (!boundsRect.width && !boundsRect.height) {
				boundsRect.width = clientRect.right - clientRect.left || media.width || 0;
				boundsRect.height = clientRect.bottom - clientRect.top || media.height || 0;
			}
		}
		this.clientRect = boundsRect;
		return boundsRect;
	}
	get mediaWidth() {
		return this.getDimensions().width * this.contentScaleFactor;
	}
	get mediaHeight() {
		return this.getDimensions().height * this.contentScaleFactor;
	}
	get contentScaleFactor() {
		let pixelRatio = 1;
		if (!this.hls) return pixelRatio;
		const { ignoreDevicePixelRatio, maxDevicePixelRatio } = this.hls.config;
		if (!ignoreDevicePixelRatio) try {
			pixelRatio = self.devicePixelRatio;
		} catch (e) {}
		return Math.min(pixelRatio, maxDevicePixelRatio);
	}
	isLevelAllowed(level) {
		return !this.restrictedLevels.some((restrictedLevel) => {
			return level.bitrate === restrictedLevel.bitrate && level.width === restrictedLevel.width && level.height === restrictedLevel.height;
		});
	}
	static getMaxLevelByMediaSize(levels, width, height) {
		if (!(levels != null && levels.length)) return -1;
		const atGreatestBandwidth = (curLevel, nextLevel) => {
			if (!nextLevel) return true;
			return curLevel.width !== nextLevel.width || curLevel.height !== nextLevel.height;
		};
		let maxLevelIndex = levels.length - 1;
		const squareSize = Math.max(width, height);
		for (let i = 0; i < levels.length; i += 1) {
			const level = levels[i];
			if ((level.width >= squareSize || level.height >= squareSize) && atGreatestBandwidth(level, levels[i + 1])) {
				maxLevelIndex = i;
				break;
			}
		}
		return maxLevelIndex;
	}
};
var PATHWAY_PENALTY_DURATION_MS = 3e5;
var ContentSteeringController = class extends Logger {
	constructor(hls) {
		super("content-steering", hls.logger);
		this.hls = void 0;
		this.loader = null;
		this.uri = null;
		this.pathwayId = ".";
		this._pathwayPriority = null;
		this.timeToLoad = 300;
		this.reloadTimer = -1;
		this.updated = 0;
		this.started = false;
		this.enabled = true;
		this.levels = null;
		this.audioTracks = null;
		this.subtitleTracks = null;
		this.penalizedPathways = {};
		this.hls = hls;
		this.registerListeners();
	}
	registerListeners() {
		const hls = this.hls;
		hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.on(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
		hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
		hls.on(Events.ERROR, this.onError, this);
	}
	unregisterListeners() {
		const hls = this.hls;
		if (!hls) return;
		hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.off(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
		hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
		hls.off(Events.ERROR, this.onError, this);
	}
	pathways() {
		return (this.levels || []).reduce((pathways, level) => {
			if (pathways.indexOf(level.pathwayId) === -1) pathways.push(level.pathwayId);
			return pathways;
		}, []);
	}
	get pathwayPriority() {
		return this._pathwayPriority;
	}
	set pathwayPriority(pathwayPriority) {
		this.updatePathwayPriority(pathwayPriority);
	}
	startLoad() {
		this.started = true;
		this.clearTimeout();
		if (this.enabled && this.uri) {
			if (this.updated) {
				const ttl = this.timeToLoad * 1e3 - (performance.now() - this.updated);
				if (ttl > 0) {
					this.scheduleRefresh(this.uri, ttl);
					return;
				}
			}
			this.loadSteeringManifest(this.uri);
		}
	}
	stopLoad() {
		this.started = false;
		if (this.loader) {
			this.loader.destroy();
			this.loader = null;
		}
		this.clearTimeout();
	}
	clearTimeout() {
		if (this.reloadTimer !== -1) {
			self.clearTimeout(this.reloadTimer);
			this.reloadTimer = -1;
		}
	}
	destroy() {
		this.unregisterListeners();
		this.stopLoad();
		this.hls = null;
		this.levels = this.audioTracks = this.subtitleTracks = null;
	}
	removeLevel(levelToRemove) {
		const levels = this.levels;
		if (levels) this.levels = levels.filter((level) => level !== levelToRemove);
	}
	onManifestLoading() {
		this.stopLoad();
		this.enabled = true;
		this.timeToLoad = 300;
		this.updated = 0;
		this.uri = null;
		this.pathwayId = ".";
		this.levels = this.audioTracks = this.subtitleTracks = null;
	}
	onManifestLoaded(event, data) {
		const { contentSteering } = data;
		if (contentSteering === null) return;
		this.pathwayId = contentSteering.pathwayId;
		this.uri = contentSteering.uri;
		if (this.started) this.startLoad();
	}
	onManifestParsed(event, data) {
		this.audioTracks = data.audioTracks;
		this.subtitleTracks = data.subtitleTracks;
	}
	onError(event, data) {
		const { errorAction } = data;
		if ((errorAction == null ? void 0 : errorAction.action) === NetworkErrorAction.SendAlternateToPenaltyBox && errorAction.flags & ErrorActionFlags.MoveAllAlternatesMatchingHost) {
			const levels = this.levels;
			let pathwayPriority = this._pathwayPriority;
			let errorPathway = this.pathwayId;
			if (data.context) {
				const { groupId, pathwayId, type } = data.context;
				if (groupId && levels) errorPathway = this.getPathwayForGroupId(groupId, type, errorPathway);
				else if (pathwayId) errorPathway = pathwayId;
			}
			if (!(errorPathway in this.penalizedPathways)) this.penalizedPathways[errorPathway] = performance.now();
			if (!pathwayPriority && levels) pathwayPriority = this.pathways();
			if (pathwayPriority && pathwayPriority.length > 1) {
				this.updatePathwayPriority(pathwayPriority);
				errorAction.resolved = this.pathwayId !== errorPathway;
				if (!errorAction.resolved && (data.details !== ErrorDetails.BUFFER_APPEND_ERROR || data.fatal)) this.warn(`Could not resolve ${data.details} ("${data.error.message}") with content-steering for Pathway: ${errorPathway} levels: ${levels ? levels.length : levels} priorities: ${stringify(pathwayPriority)} penalized: ${stringify(this.penalizedPathways)}`);
			}
		}
	}
	filterParsedLevels(levels) {
		this.levels = levels;
		let pathwayLevels = this.getLevelsForPathway(this.pathwayId);
		if (pathwayLevels.length === 0) {
			const pathwayId = levels[0].pathwayId;
			this.log(`No levels found in Pathway ${this.pathwayId}. Setting initial Pathway to "${pathwayId}"`);
			pathwayLevels = this.getLevelsForPathway(pathwayId);
			this.pathwayId = pathwayId;
		}
		if (pathwayLevels.length !== levels.length) this.log(`Found ${pathwayLevels.length}/${levels.length} levels in Pathway "${this.pathwayId}"`);
		return pathwayLevels;
	}
	getLevelsForPathway(pathwayId) {
		if (this.levels === null) return [];
		return this.levels.filter((level) => pathwayId === level.pathwayId);
	}
	updatePathwayPriority(pathwayPriority) {
		this._pathwayPriority = pathwayPriority;
		let levels;
		const penalizedPathways = this.penalizedPathways;
		const now = performance.now();
		Object.keys(penalizedPathways).forEach((pathwayId) => {
			if (now - penalizedPathways[pathwayId] > PATHWAY_PENALTY_DURATION_MS) delete penalizedPathways[pathwayId];
		});
		for (let i = 0; i < pathwayPriority.length; i++) {
			const pathwayId = pathwayPriority[i];
			if (pathwayId in penalizedPathways) continue;
			if (pathwayId === this.pathwayId) return;
			const selectedIndex = this.hls.nextLoadLevel;
			const selectedLevel = this.hls.levels[selectedIndex];
			levels = this.getLevelsForPathway(pathwayId);
			if (levels.length > 0) {
				this.log(`Setting Pathway to "${pathwayId}"`);
				this.pathwayId = pathwayId;
				reassignFragmentLevelIndexes(levels);
				this.hls.trigger(Events.LEVELS_UPDATED, { levels });
				const levelAfterChange = this.hls.levels[selectedIndex];
				if (selectedLevel && levelAfterChange && this.levels) {
					if (levelAfterChange.attrs["STABLE-VARIANT-ID"] !== selectedLevel.attrs["STABLE-VARIANT-ID"] && levelAfterChange.bitrate !== selectedLevel.bitrate) this.log(`Unstable Pathways change from bitrate ${selectedLevel.bitrate} to ${levelAfterChange.bitrate}`);
					this.hls.nextLoadLevel = selectedIndex;
				}
				break;
			}
		}
	}
	getPathwayForGroupId(groupId, type, defaultPathway) {
		const levels = this.getLevelsForPathway(defaultPathway).concat(this.levels || []);
		for (let i = 0; i < levels.length; i++) if (type === LoaderContextType.AUDIO_TRACK && levels[i].hasAudioGroup(groupId) || type === LoaderContextType.SUBTITLE_TRACK && levels[i].hasSubtitleGroup(groupId)) return levels[i].pathwayId;
		return defaultPathway;
	}
	clonePathways(pathwayClones) {
		const levels = this.levels;
		if (!levels) return;
		const audioGroupCloneMap = {};
		const subtitleGroupCloneMap = {};
		pathwayClones.forEach((pathwayClone) => {
			const { ID: cloneId, "BASE-ID": baseId, "URI-REPLACEMENT": uriReplacement } = pathwayClone;
			if (levels.some((level) => level.pathwayId === cloneId)) return;
			const clonedVariants = this.getLevelsForPathway(baseId).map((baseLevel) => {
				const attributes = new AttrList(baseLevel.attrs);
				attributes["PATHWAY-ID"] = cloneId;
				const clonedAudioGroupId = attributes.AUDIO && `${attributes.AUDIO}_clone_${cloneId}`;
				const clonedSubtitleGroupId = attributes.SUBTITLES && `${attributes.SUBTITLES}_clone_${cloneId}`;
				if (clonedAudioGroupId) {
					audioGroupCloneMap[attributes.AUDIO] = clonedAudioGroupId;
					attributes.AUDIO = clonedAudioGroupId;
				}
				if (clonedSubtitleGroupId) {
					subtitleGroupCloneMap[attributes.SUBTITLES] = clonedSubtitleGroupId;
					attributes.SUBTITLES = clonedSubtitleGroupId;
				}
				const url = performUriReplacement(baseLevel.uri, attributes["STABLE-VARIANT-ID"], "PER-VARIANT-URIS", uriReplacement);
				const clonedLevel = new Level({
					attrs: attributes,
					audioCodec: baseLevel.audioCodec,
					bitrate: baseLevel.bitrate,
					height: baseLevel.height,
					name: baseLevel.name,
					url,
					videoCodec: baseLevel.videoCodec,
					width: baseLevel.width
				});
				if (baseLevel.audioGroups) for (let i = 1; i < baseLevel.audioGroups.length; i++) clonedLevel.addGroupId("audio", `${baseLevel.audioGroups[i]}_clone_${cloneId}`);
				if (baseLevel.subtitleGroups) for (let i = 1; i < baseLevel.subtitleGroups.length; i++) clonedLevel.addGroupId("text", `${baseLevel.subtitleGroups[i]}_clone_${cloneId}`);
				return clonedLevel;
			});
			levels.push(...clonedVariants);
			cloneRenditionGroups(this.audioTracks, audioGroupCloneMap, uriReplacement, cloneId);
			cloneRenditionGroups(this.subtitleTracks, subtitleGroupCloneMap, uriReplacement, cloneId);
		});
	}
	loadSteeringManifest(uri) {
		const config = this.hls.config;
		const Loader = config.loader;
		if (this.loader) this.loader.destroy();
		this.loader = new Loader(config);
		let url;
		try {
			url = new self.URL(uri);
		} catch (error) {
			this.enabled = false;
			this.log(`Failed to parse Steering Manifest URI: ${uri}`);
			return;
		}
		if (url.protocol !== "data:") {
			const throughput = (this.hls.bandwidthEstimate || config.abrEwmaDefaultEstimate) | 0;
			setQueryParam(url, "_HLS_pathway", this.pathwayId);
			setQueryParam(url, "_HLS_throughput", "" + throughput);
		}
		const context = {
			type: LoaderContextType.STEERING_MANIFEST,
			responseType: "json",
			url: url.href
		};
		const loadPolicy = config.steeringManifestLoadPolicy.default;
		const legacyRetryCompatibility = loadPolicy.errorRetry || loadPolicy.timeoutRetry || {};
		const loaderConfig = {
			loadPolicy,
			timeout: loadPolicy.maxLoadTimeMs,
			maxRetry: legacyRetryCompatibility.maxNumRetry || 0,
			retryDelay: legacyRetryCompatibility.retryDelayMs || 0,
			maxRetryDelay: legacyRetryCompatibility.maxRetryDelayMs || 0
		};
		const callbacks = {
			onSuccess: (response, stats, context, networkDetails) => {
				this.log(`Loaded steering manifest: "${url}"`);
				const steeringData = response.data;
				if ((steeringData == null ? void 0 : steeringData.VERSION) !== 1) {
					this.log(`Steering VERSION ${steeringData.VERSION} not supported!`);
					return;
				}
				this.updated = performance.now();
				this.timeToLoad = steeringData.TTL;
				const { "RELOAD-URI": reloadUri, "PATHWAY-CLONES": pathwayClones, "PATHWAY-PRIORITY": pathwayPriority } = steeringData;
				if (reloadUri) try {
					this.uri = new self.URL(reloadUri, url).href;
				} catch (error) {
					this.enabled = false;
					this.log(`Failed to parse Steering Manifest RELOAD-URI: ${reloadUri}`);
					return;
				}
				this.scheduleRefresh(this.uri || context.url);
				if (pathwayClones) this.clonePathways(pathwayClones);
				const loadedSteeringData = {
					steeringManifest: steeringData,
					url: url.toString()
				};
				this.hls.trigger(Events.STEERING_MANIFEST_LOADED, loadedSteeringData);
				if (pathwayPriority) this.updatePathwayPriority(pathwayPriority);
			},
			onError: (error, context, networkDetails, stats) => {
				this.log(`Error loading steering manifest: ${error.code} ${error.text} (${context.url})`);
				this.stopLoad();
				if (error.code === 410) {
					this.enabled = false;
					this.log(`Steering manifest ${context.url} no longer available`);
					return;
				}
				let ttl = this.timeToLoad * 1e3;
				if (error.code === 429) {
					const loader = this.loader;
					if (typeof (loader == null ? void 0 : loader.getResponseHeader) === "function") {
						const retryAfter = loader.getResponseHeader("Retry-After");
						if (retryAfter) ttl = parseFloat(retryAfter) * 1e3;
					}
					this.log(`Steering manifest ${context.url} rate limited`);
					return;
				}
				this.scheduleRefresh(this.uri || context.url, ttl);
			},
			onTimeout: (stats, context, networkDetails) => {
				this.log(`Timeout loading steering manifest (${context.url})`);
				this.scheduleRefresh(this.uri || context.url);
			}
		};
		this.log(`Requesting steering manifest: ${url}`);
		this.loader.load(context, loaderConfig, callbacks);
	}
	scheduleRefresh(uri, ttlMs = this.timeToLoad * 1e3) {
		this.clearTimeout();
		this.reloadTimer = self.setTimeout(() => {
			var _this$hls;
			const media = (_this$hls = this.hls) == null ? void 0 : _this$hls.media;
			if (media && !media.ended) {
				this.loadSteeringManifest(uri);
				return;
			}
			this.scheduleRefresh(uri, this.timeToLoad * 1e3);
		}, ttlMs);
	}
};
function cloneRenditionGroups(tracks, groupCloneMap, uriReplacement, cloneId) {
	if (!tracks) return;
	Object.keys(groupCloneMap).forEach((audioGroupId) => {
		const clonedTracks = tracks.filter((track) => track.groupId === audioGroupId).map((track) => {
			const clonedTrack = _extends({}, track);
			clonedTrack.details = void 0;
			clonedTrack.attrs = new AttrList(clonedTrack.attrs);
			clonedTrack.url = clonedTrack.attrs.URI = performUriReplacement(track.url, track.attrs["STABLE-RENDITION-ID"], "PER-RENDITION-URIS", uriReplacement);
			clonedTrack.groupId = clonedTrack.attrs["GROUP-ID"] = groupCloneMap[audioGroupId];
			clonedTrack.attrs["PATHWAY-ID"] = cloneId;
			return clonedTrack;
		});
		tracks.push(...clonedTracks);
	});
}
function performUriReplacement(uri, stableId, perOptionKey, uriReplacement) {
	if (stableId) {
		const { [perOptionKey]: perOptionUris } = uriReplacement;
		if (perOptionUris) {
			const perVariantUri = perOptionUris[stableId];
			if (perVariantUri) return perVariantUri;
		}
	}
	const { HOST: host, PARAMS: params } = uriReplacement;
	const url = new self.URL(uri);
	if (host) url.hostname = host;
	if (params) Object.keys(params).sort().forEach((key) => {
		if (key) setQueryParam(url, key, params[key]);
	});
	return url.href;
}
var FPSController = class {
	constructor(hls) {
		this.hls = void 0;
		this.isVideoPlaybackQualityAvailable = false;
		this.timer = void 0;
		this.media = null;
		this.lastTime = void 0;
		this.lastDroppedFrames = 0;
		this.lastDecodedFrames = 0;
		this.streamController = void 0;
		this.hls = hls;
		this.registerListeners();
	}
	setStreamController(streamController) {
		this.streamController = streamController;
	}
	registerListeners() {
		this.hls.on(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
		this.hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
	}
	unregisterListeners() {
		this.hls.off(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
		this.hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
	}
	destroy() {
		if (this.timer) clearInterval(this.timer);
		this.unregisterListeners();
		this.isVideoPlaybackQualityAvailable = false;
		this.media = null;
	}
	onMediaAttaching(event, data) {
		const config = this.hls.config;
		if (config.capLevelOnFPSDrop) {
			const media = data.media instanceof self.HTMLVideoElement ? data.media : null;
			this.media = media;
			if (media && typeof media.getVideoPlaybackQuality === "function") this.isVideoPlaybackQualityAvailable = true;
			self.clearInterval(this.timer);
			this.timer = self.setInterval(this.checkFPSInterval.bind(this), config.fpsDroppedMonitoringPeriod);
		}
	}
	onMediaDetaching() {
		this.media = null;
	}
	checkFPS(video, decodedFrames, droppedFrames) {
		const currentTime = performance.now();
		if (decodedFrames) {
			if (this.lastTime) {
				const currentPeriod = currentTime - this.lastTime;
				const currentDropped = droppedFrames - this.lastDroppedFrames;
				const currentDecoded = decodedFrames - this.lastDecodedFrames;
				const droppedFPS = 1e3 * currentDropped / currentPeriod;
				const hls = this.hls;
				hls.trigger(Events.FPS_DROP, {
					currentDropped,
					currentDecoded,
					totalDroppedFrames: droppedFrames
				});
				if (droppedFPS > 0) {
					if (currentDropped > hls.config.fpsDroppedMonitoringThreshold * currentDecoded) {
						let currentLevel = hls.currentLevel;
						hls.logger.warn("drop FPS ratio greater than max allowed value for currentLevel: " + currentLevel);
						if (currentLevel > 0 && (hls.autoLevelCapping === -1 || hls.autoLevelCapping >= currentLevel)) {
							currentLevel = currentLevel - 1;
							hls.trigger(Events.FPS_DROP_LEVEL_CAPPING, {
								level: currentLevel,
								droppedLevel: hls.currentLevel
							});
							hls.autoLevelCapping = currentLevel;
							this.streamController.nextLevelSwitch();
						}
					}
				}
			}
			this.lastTime = currentTime;
			this.lastDroppedFrames = droppedFrames;
			this.lastDecodedFrames = decodedFrames;
		}
	}
	checkFPSInterval() {
		const video = this.media;
		if (video) {
			if (this.isVideoPlaybackQualityAvailable) {
				const videoPlaybackQuality = video.getVideoPlaybackQuality();
				this.checkFPS(video, videoPlaybackQuality.totalVideoFrames, videoPlaybackQuality.droppedVideoFrames);
			} else this.checkFPS(video, video.webkitDecodedFrameCount, video.webkitDroppedFrameCount);
		}
	}
};
var eventemitter3 = { exports: {} };
var hasRequiredEventemitter3;
function requireEventemitter3() {
	if (hasRequiredEventemitter3) return eventemitter3.exports;
	hasRequiredEventemitter3 = 1;
	(function(module) {
		var has = Object.prototype.hasOwnProperty, prefix = "~";
		/**
		* Constructor to create a storage for our `EE` objects.
		* An `Events` instance is a plain object whose properties are event names.
		*
		* @constructor
		* @private
		*/
		function Events() {}
		if (Object.create) {
			Events.prototype = Object.create(null);
			if (!new Events().__proto__) prefix = false;
		}
		/**
		* Representation of a single event listener.
		*
		* @param {Function} fn The listener function.
		* @param {*} context The context to invoke the listener with.
		* @param {Boolean} [once=false] Specify if the listener is a one-time listener.
		* @constructor
		* @private
		*/
		function EE(fn, context, once) {
			this.fn = fn;
			this.context = context;
			this.once = once || false;
		}
		/**
		* Add a listener for a given event.
		*
		* @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
		* @param {(String|Symbol)} event The event name.
		* @param {Function} fn The listener function.
		* @param {*} context The context to invoke the listener with.
		* @param {Boolean} once Specify if the listener is a one-time listener.
		* @returns {EventEmitter}
		* @private
		*/
		function addListener(emitter, event, fn, context, once) {
			if (typeof fn !== "function") throw new TypeError("The listener must be a function");
			var listener = new EE(fn, context || emitter, once), evt = prefix ? prefix + event : event;
			if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
			else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
			else emitter._events[evt] = [emitter._events[evt], listener];
			return emitter;
		}
		/**
		* Clear event by name.
		*
		* @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
		* @param {(String|Symbol)} evt The Event name.
		* @private
		*/
		function clearEvent(emitter, evt) {
			if (--emitter._eventsCount === 0) emitter._events = new Events();
			else delete emitter._events[evt];
		}
		/**
		* Minimal `EventEmitter` interface that is molded against the Node.js
		* `EventEmitter` interface.
		*
		* @constructor
		* @public
		*/
		function EventEmitter() {
			this._events = new Events();
			this._eventsCount = 0;
		}
		/**
		* Return an array listing the events for which the emitter has registered
		* listeners.
		*
		* @returns {Array}
		* @public
		*/
		EventEmitter.prototype.eventNames = function eventNames() {
			var names = [], events, name;
			if (this._eventsCount === 0) return names;
			for (name in events = this._events) if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
			if (Object.getOwnPropertySymbols) return names.concat(Object.getOwnPropertySymbols(events));
			return names;
		};
		/**
		* Return the listeners registered for a given event.
		*
		* @param {(String|Symbol)} event The event name.
		* @returns {Array} The registered listeners.
		* @public
		*/
		EventEmitter.prototype.listeners = function listeners(event) {
			var evt = prefix ? prefix + event : event, handlers = this._events[evt];
			if (!handlers) return [];
			if (handlers.fn) return [handlers.fn];
			for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) ee[i] = handlers[i].fn;
			return ee;
		};
		/**
		* Return the number of listeners listening to a given event.
		*
		* @param {(String|Symbol)} event The event name.
		* @returns {Number} The number of listeners.
		* @public
		*/
		EventEmitter.prototype.listenerCount = function listenerCount(event) {
			var evt = prefix ? prefix + event : event, listeners = this._events[evt];
			if (!listeners) return 0;
			if (listeners.fn) return 1;
			return listeners.length;
		};
		/**
		* Calls each of the listeners registered for a given event.
		*
		* @param {(String|Symbol)} event The event name.
		* @returns {Boolean} `true` if the event had listeners, else `false`.
		* @public
		*/
		EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
			var evt = prefix ? prefix + event : event;
			if (!this._events[evt]) return false;
			var listeners = this._events[evt], len = arguments.length, args, i;
			if (listeners.fn) {
				if (listeners.once) this.removeListener(event, listeners.fn, void 0, true);
				switch (len) {
					case 1: return listeners.fn.call(listeners.context), true;
					case 2: return listeners.fn.call(listeners.context, a1), true;
					case 3: return listeners.fn.call(listeners.context, a1, a2), true;
					case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
					case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
					case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
				}
				for (i = 1, args = new Array(len - 1); i < len; i++) args[i - 1] = arguments[i];
				listeners.fn.apply(listeners.context, args);
			} else {
				var length = listeners.length, j;
				for (i = 0; i < length; i++) {
					if (listeners[i].once) this.removeListener(event, listeners[i].fn, void 0, true);
					switch (len) {
						case 1:
							listeners[i].fn.call(listeners[i].context);
							break;
						case 2:
							listeners[i].fn.call(listeners[i].context, a1);
							break;
						case 3:
							listeners[i].fn.call(listeners[i].context, a1, a2);
							break;
						case 4:
							listeners[i].fn.call(listeners[i].context, a1, a2, a3);
							break;
						default:
							if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) args[j - 1] = arguments[j];
							listeners[i].fn.apply(listeners[i].context, args);
					}
				}
			}
			return true;
		};
		/**
		* Add a listener for a given event.
		*
		* @param {(String|Symbol)} event The event name.
		* @param {Function} fn The listener function.
		* @param {*} [context=this] The context to invoke the listener with.
		* @returns {EventEmitter} `this`.
		* @public
		*/
		EventEmitter.prototype.on = function on(event, fn, context) {
			return addListener(this, event, fn, context, false);
		};
		/**
		* Add a one-time listener for a given event.
		*
		* @param {(String|Symbol)} event The event name.
		* @param {Function} fn The listener function.
		* @param {*} [context=this] The context to invoke the listener with.
		* @returns {EventEmitter} `this`.
		* @public
		*/
		EventEmitter.prototype.once = function once(event, fn, context) {
			return addListener(this, event, fn, context, true);
		};
		/**
		* Remove the listeners of a given event.
		*
		* @param {(String|Symbol)} event The event name.
		* @param {Function} fn Only remove the listeners that match this function.
		* @param {*} context Only remove the listeners that have this context.
		* @param {Boolean} once Only remove one-time listeners.
		* @returns {EventEmitter} `this`.
		* @public
		*/
		EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
			var evt = prefix ? prefix + event : event;
			if (!this._events[evt]) return this;
			if (!fn) {
				clearEvent(this, evt);
				return this;
			}
			var listeners = this._events[evt];
			if (listeners.fn) {
				if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) clearEvent(this, evt);
			} else {
				for (var i = 0, events = [], length = listeners.length; i < length; i++) if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) events.push(listeners[i]);
				if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
				else clearEvent(this, evt);
			}
			return this;
		};
		/**
		* Remove all listeners, or those of the specified event.
		*
		* @param {(String|Symbol)} [event] The event name.
		* @returns {EventEmitter} `this`.
		* @public
		*/
		EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
			var evt;
			if (event) {
				evt = prefix ? prefix + event : event;
				if (this._events[evt]) clearEvent(this, evt);
			} else {
				this._events = new Events();
				this._eventsCount = 0;
			}
			return this;
		};
		EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
		EventEmitter.prototype.addListener = EventEmitter.prototype.on;
		EventEmitter.prefixed = prefix;
		EventEmitter.EventEmitter = EventEmitter;
		module.exports = EventEmitter;
	})(eventemitter3);
	return eventemitter3.exports;
}
var EventEmitter = /*@__PURE__*/ getDefaultExportFromCjs(requireEventemitter3());
var MAX_START_GAP_JUMP = 2;
var TICK_INTERVAL$1 = 100;
var GapController = class extends TaskLoop {
	constructor(hls, fragmentTracker) {
		super("gap-controller", hls.logger);
		this.hls = void 0;
		this.fragmentTracker = void 0;
		this.media = null;
		this.mediaSource = void 0;
		this.nudgeRetry = 0;
		this.skipRetry = 0;
		this.stallReported = false;
		this.stalled = null;
		this.moved = false;
		this.seeking = false;
		this.buffered = {};
		this.lastCurrentTime = void 0;
		this.ended = 0;
		this.waiting = 0;
		this.onMediaPlaying = () => {
			this.ended = 0;
			this.waiting = 0;
		};
		this.onMediaWaiting = () => {
			var _this$media;
			if ((_this$media = this.media) != null && _this$media.seeking) return;
			this.waiting = self.performance.now();
			this.tick();
		};
		this.onMediaEnded = () => {
			if (this.hls) {
				var _this$media2;
				this.ended = ((_this$media2 = this.media) == null ? void 0 : _this$media2.currentTime) || 1;
				this.hls.trigger(Events.MEDIA_ENDED, { stalled: false });
			}
		};
		this.hls = hls;
		this.fragmentTracker = fragmentTracker;
		this.lastCurrentTime = this.getCurrentTime();
		this.registerListeners();
	}
	registerListeners() {
		const { hls } = this;
		if (hls) {
			hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
			hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
			hls.on(Events.BUFFER_APPENDED, this.onBufferAppended, this);
		}
	}
	unregisterListeners() {
		const { hls } = this;
		if (hls) {
			hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
			hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
			hls.off(Events.BUFFER_APPENDED, this.onBufferAppended, this);
		}
	}
	destroy() {
		super.destroy();
		this.unregisterListeners();
		this.media = this.hls = this.fragmentTracker = null;
		this.mediaSource = void 0;
	}
	onMediaAttached(event, data) {
		this.setInterval(TICK_INTERVAL$1);
		this.mediaSource = data.mediaSource;
		const media = this.media = data.media;
		addEventListener(media, "playing", this.onMediaPlaying);
		addEventListener(media, "waiting", this.onMediaWaiting);
		addEventListener(media, "ended", this.onMediaEnded);
	}
	onMediaDetaching(event, data) {
		this.clearInterval();
		const { media } = this;
		if (media) {
			removeEventListener(media, "playing", this.onMediaPlaying);
			removeEventListener(media, "waiting", this.onMediaWaiting);
			removeEventListener(media, "ended", this.onMediaEnded);
			this.media = null;
		}
		this.mediaSource = void 0;
	}
	onBufferAppended(event, data) {
		this.buffered = data.timeRanges;
	}
	get hasBuffered() {
		return Object.keys(this.buffered).length > 0;
	}
	getCurrentTime() {
		var _this$hls;
		const timelineOffset = ((_this$hls = this.hls) == null ? void 0 : _this$hls.config.timelineOffset) || 0;
		if (this.media) return Math.max(this.media.currentTime, timelineOffset);
		return timelineOffset;
	}
	tick() {
		var _this$media3;
		if (!((_this$media3 = this.media) != null && _this$media3.readyState) || !this.hasBuffered) return;
		const currentTime = this.getCurrentTime();
		if (this.media.currentTime < currentTime) return;
		this.poll(currentTime, this.lastCurrentTime);
		this.lastCurrentTime = currentTime;
	}
	/**
	* Checks if the playhead is stuck within a gap, and if so, attempts to free it.
	* A gap is an unbuffered range between two buffered ranges (or the start and the first buffered range).
	*
	* @param lastCurrentTime - Previously read playhead position
	*/
	poll(currentTime, lastCurrentTime) {
		var _this$hls2, _this$hls3;
		const config = (_this$hls2 = this.hls) == null ? void 0 : _this$hls2.config;
		if (!config) return;
		const media = this.media;
		if (!media) return;
		const { seeking } = media;
		const seeked = this.seeking && !seeking;
		const beginSeek = !this.seeking && seeking;
		const pausedEndedOrHalted = media.paused && !seeking || media.ended || media.playbackRate === 0;
		this.seeking = seeking;
		if (currentTime !== lastCurrentTime) {
			if (lastCurrentTime) this.ended = 0;
			this.moved = true;
			if (!seeking) {
				this.skipRetry = this.nudgeRetry = 0;
				if (config.nudgeOnVideoHole && !pausedEndedOrHalted && currentTime > lastCurrentTime) this.nudgeOnVideoHole(currentTime, lastCurrentTime);
			}
			if (this.waiting === 0) this.stallResolved(currentTime);
			return;
		}
		if (beginSeek || seeked) {
			if (seeked) this.stallResolved(currentTime);
			return;
		}
		if (pausedEndedOrHalted) {
			this.skipRetry = this.nudgeRetry = 0;
			this.stallResolved(currentTime);
			if (!this.ended && media.ended && this.hls) {
				this.ended = currentTime || 1;
				this.hls.trigger(Events.MEDIA_ENDED, { stalled: false });
			}
			return;
		}
		if (!BufferHelper.getBuffered(media).length) {
			this.skipRetry = this.nudgeRetry = 0;
			return;
		}
		const bufferInfo = BufferHelper.bufferInfo(media, currentTime, 0);
		const fragmentTracker = this.fragmentTracker;
		if (fragmentTracker && this.hls) withInterstitialBoundary(bufferInfo, currentTime, fragmentTracker, this.hls);
		const nextStart = bufferInfo.nextStart || 0;
		if (seeking && fragmentTracker && this.hls) {
			const inFlightDependency = getInFlightDependency(this.hls.inFlightFragments, currentTime);
			const hasEnoughBuffer = bufferInfo.len > MAX_START_GAP_JUMP;
			const noBufferHole = !nextStart || inFlightDependency || nextStart - currentTime > MAX_START_GAP_JUMP && !fragmentTracker.getPartialFragment(currentTime);
			if (hasEnoughBuffer || noBufferHole) return;
			this.moved = false;
		}
		const levelDetails = (_this$hls3 = this.hls) == null ? void 0 : _this$hls3.latestLevelDetails;
		if (!this.moved && this.stalled !== null && fragmentTracker) {
			if (!(bufferInfo.len > 0) && !nextStart) return;
			const startJump = Math.max(nextStart, bufferInfo.start || 0) - currentTime;
			const maxStartGapJump = !!(levelDetails != null && levelDetails.live) ? levelDetails.targetduration * 2 : MAX_START_GAP_JUMP;
			const appended = appendedFragAtPosition(currentTime, fragmentTracker);
			if (startJump > 0 && (startJump <= maxStartGapJump || appended)) {
				if (!media.paused) this._trySkipBufferHole(appended);
				return;
			}
		}
		const detectStallWithCurrentTimeMs = config.detectStallWithCurrentTimeMs;
		const tnow = self.performance.now();
		const tWaiting = this.waiting;
		let stalled = this.stalled;
		if (stalled === null) {
			if (tWaiting > 0 && tnow - tWaiting < detectStallWithCurrentTimeMs) stalled = this.stalled = tWaiting;
			else {
				this.stalled = tnow;
				return;
			}
		}
		const stalledDuration = tnow - stalled;
		if (!seeking && (stalledDuration >= detectStallWithCurrentTimeMs || tWaiting && this.moved) && this.hls) {
			var _this$mediaSource;
			if (((_this$mediaSource = this.mediaSource) == null ? void 0 : _this$mediaSource.readyState) === "ended" && !(levelDetails != null && levelDetails.live) && Math.abs(currentTime - ((levelDetails == null ? void 0 : levelDetails.edge) || 0)) < 1) {
				if (this.ended) return;
				this.ended = currentTime || 1;
				this.hls.trigger(Events.MEDIA_ENDED, { stalled: true });
				return;
			}
			this._reportStall(bufferInfo);
			if (!this.media || !this.hls) return;
			if (media.currentTime !== currentTime) {
				const currentTimeBeforeStallEvent = currentTime;
				currentTime = media.currentTime;
				this.moved = true;
				this.log(`currentTime changed ${currentTimeBeforeStallEvent} > ${currentTime}`);
				return;
			}
		}
		const bufferedWithHoles = BufferHelper.bufferInfo(media, currentTime, config.maxBufferHole);
		this._tryFixBufferStall(bufferedWithHoles, stalledDuration, currentTime);
	}
	stallResolved(currentTime) {
		const stalled = this.stalled;
		if (stalled && this.hls) {
			this.stalled = null;
			if (this.stallReported) {
				const stalledDuration = self.performance.now() - stalled;
				this.log(`playback not stuck anymore @${currentTime}, after ${Math.round(stalledDuration)}ms`);
				this.stallReported = false;
				this.waiting = 0;
				this.hls.trigger(Events.STALL_RESOLVED, {});
			}
		}
	}
	nudgeOnVideoHole(currentTime, lastCurrentTime) {
		var _this$buffered$audio;
		const videoSourceBuffered = this.buffered.video;
		if (this.hls && this.media && this.fragmentTracker && (_this$buffered$audio = this.buffered.audio) != null && _this$buffered$audio.length && videoSourceBuffered && videoSourceBuffered.length > 1 && currentTime > videoSourceBuffered.end(0)) {
			const audioBufferInfo = BufferHelper.bufferedInfo(BufferHelper.timeRangesToArray(this.buffered.audio), currentTime, 0);
			if (audioBufferInfo.len > 1 && lastCurrentTime >= audioBufferInfo.start) {
				const videoTimes = BufferHelper.timeRangesToArray(videoSourceBuffered);
				const lastBufferedIndex = BufferHelper.bufferedInfo(videoTimes, lastCurrentTime, 0).bufferedIndex;
				if (lastBufferedIndex > -1 && lastBufferedIndex < videoTimes.length - 1) {
					const bufferedIndex = BufferHelper.bufferedInfo(videoTimes, currentTime, 0).bufferedIndex;
					const holeStart = videoTimes[lastBufferedIndex].end;
					const holeEnd = videoTimes[lastBufferedIndex + 1].start;
					if ((bufferedIndex === -1 || bufferedIndex > lastBufferedIndex) && holeEnd - holeStart < 1 && currentTime - holeStart < 2) {
						const error = /* @__PURE__ */ new Error(`nudging playhead to flush pipeline after video hole. currentTime: ${currentTime} hole: ${holeStart} -> ${holeEnd} buffered index: ${bufferedIndex}`);
						this.warn(error.message);
						this.media.currentTime += 1e-6;
						let frag = appendedFragAtPosition(currentTime, this.fragmentTracker);
						if (frag && "fragment" in frag) frag = frag.fragment;
						else if (!frag) frag = void 0;
						const bufferInfo = BufferHelper.bufferInfo(this.media, currentTime, 0);
						this.hls.trigger(Events.ERROR, {
							type: ErrorTypes.MEDIA_ERROR,
							details: ErrorDetails.BUFFER_SEEK_OVER_HOLE,
							fatal: false,
							error,
							reason: error.message,
							frag,
							buffer: bufferInfo.len,
							bufferInfo
						});
					}
				}
			}
		}
	}
	/**
	* Detects and attempts to fix known buffer stalling issues.
	* @param bufferInfo - The properties of the current buffer.
	* @param stalledDurationMs - The amount of time Hls.js has been stalling for.
	* @private
	*/
	_tryFixBufferStall(bufferInfo, stalledDurationMs, currentTime) {
		var _this$hls4, _this$hls5;
		const { fragmentTracker, media } = this;
		const config = (_this$hls4 = this.hls) == null ? void 0 : _this$hls4.config;
		if (!media || !fragmentTracker || !config) return;
		const levelDetails = (_this$hls5 = this.hls) == null ? void 0 : _this$hls5.latestLevelDetails;
		const appended = appendedFragAtPosition(currentTime, fragmentTracker);
		if (appended || levelDetails != null && levelDetails.live && currentTime < levelDetails.fragmentStart) {
			if (this._trySkipBufferHole(appended) || !this.media) return;
		}
		const bufferedRanges = bufferInfo.buffered;
		const adjacentTraversal = this.adjacentTraversal(bufferInfo, currentTime);
		if ((bufferedRanges && bufferedRanges.length > 1 && bufferInfo.len > config.maxBufferHole || bufferInfo.nextStart && (bufferInfo.nextStart - currentTime < config.maxBufferHole || adjacentTraversal)) && (stalledDurationMs > config.highBufferWatchdogPeriod * 1e3 || this.waiting)) {
			this.warn("Trying to nudge playhead over buffer-hole");
			this._tryNudgeBuffer(bufferInfo);
		}
	}
	adjacentTraversal(bufferInfo, currentTime) {
		const fragmentTracker = this.fragmentTracker;
		const nextStart = bufferInfo.nextStart;
		if (fragmentTracker && nextStart) {
			const current = fragmentTracker.getFragAtPos(currentTime, PlaylistLevelType.MAIN);
			const next = fragmentTracker.getFragAtPos(nextStart, PlaylistLevelType.MAIN);
			if (current && next) return next.sn - current.sn < 2;
		}
		return false;
	}
	/**
	* Triggers a BUFFER_STALLED_ERROR event, but only once per stall period.
	* @param bufferLen - The playhead distance from the end of the current buffer segment.
	* @private
	*/
	_reportStall(bufferInfo) {
		const { hls, media, stallReported, stalled } = this;
		if (!stallReported && stalled !== null && media && hls) {
			this.stallReported = true;
			const error = /* @__PURE__ */ new Error(`Playback stalling at @${media.currentTime} due to low buffer (${stringify(bufferInfo)})`);
			this.warn(error.message);
			hls.trigger(Events.ERROR, {
				type: ErrorTypes.MEDIA_ERROR,
				details: ErrorDetails.BUFFER_STALLED_ERROR,
				fatal: false,
				error,
				buffer: bufferInfo.len,
				bufferInfo,
				stalled: { start: stalled }
			});
		}
	}
	/**
	* Attempts to fix buffer stalls by jumping over known gaps caused by partial fragments
	* @param appended - The fragment or part found at the current time (where playback is stalling).
	* @private
	*/
	_trySkipBufferHole(appended) {
		const { fragmentTracker, media, hls } = this;
		const config = hls == null ? void 0 : hls.config;
		if (!media || !fragmentTracker || !config) return 0;
		const currentTime = media.currentTime;
		const bufferInfo = BufferHelper.bufferInfo(media, currentTime, 0);
		withInterstitialBoundary(bufferInfo, currentTime, fragmentTracker, hls);
		const startTime = currentTime < bufferInfo.start ? bufferInfo.start : bufferInfo.nextStart;
		if (startTime) {
			const bufferStarved = bufferInfo.len <= config.maxBufferHole;
			const waiting = bufferInfo.len > 0 && bufferInfo.len < 1 && media.readyState < 3;
			const gapLength = startTime - currentTime;
			if (gapLength > 0 && (bufferStarved || waiting)) {
				if (gapLength > config.maxBufferHole) {
					let startGap = false;
					if (currentTime === 0) {
						const startFrag = fragmentTracker.getAppendedFrag(0, PlaylistLevelType.MAIN);
						if (startFrag && startTime < startFrag.end) startGap = true;
					}
					if (!startGap && appended) {
						var _hls$loadLevelObj;
						if (!((_hls$loadLevelObj = hls.loadLevelObj) != null && _hls$loadLevelObj.details)) return 0;
						if (getInFlightDependency(hls.inFlightFragments, startTime)) return 0;
						let moreToLoad = false;
						let pos = appended.end;
						while (pos < startTime) {
							const provisioned = appendedFragAtPosition(pos, fragmentTracker);
							const duration = provisioned ? provisioned.duration : 0;
							if (duration > 0) pos += duration;
							else {
								moreToLoad = true;
								break;
							}
						}
						if (moreToLoad) return 0;
					}
				}
				const { nudgeMaxRetry, skipBufferHolePadding } = config;
				const fatal = ++this.skipRetry > nudgeMaxRetry;
				const targetTime = Math.max(startTime, currentTime) + skipBufferHolePadding;
				if (!fatal) {
					this.warn(`skipping hole, adjusting currentTime from ${currentTime} to ${targetTime}`);
					this.moved = true;
					media.currentTime = targetTime;
				}
				if (!(appended != null && appended.gap) || fatal) {
					const error = /* @__PURE__ */ new Error(fatal ? `Playhead still not moving after seeking over buffer hole from ${currentTime} to ${targetTime} after ${config.nudgeMaxRetry} attempts.` : `fragment loaded with buffer holes, seeking from ${currentTime} to ${targetTime}`);
					const errorData = {
						type: ErrorTypes.MEDIA_ERROR,
						details: ErrorDetails.BUFFER_SEEK_OVER_HOLE,
						fatal,
						error,
						reason: error.message,
						buffer: bufferInfo.len,
						bufferInfo
					};
					if (appended) {
						if ("fragment" in appended) errorData.part = appended;
						else errorData.frag = appended;
					}
					hls.trigger(Events.ERROR, errorData);
				}
				return targetTime;
			}
		}
		return 0;
	}
	/**
	* Attempts to fix buffer stalls by advancing the mediaElement's current time by a small amount.
	* @private
	*/
	_tryNudgeBuffer(bufferInfo) {
		const { hls, media, nudgeRetry } = this;
		const config = hls == null ? void 0 : hls.config;
		if (!media || !config) return 0;
		const currentTime = media.currentTime;
		this.nudgeRetry++;
		if (nudgeRetry < config.nudgeMaxRetry) {
			const targetTime = currentTime + (nudgeRetry + 1) * config.nudgeOffset;
			const error = /* @__PURE__ */ new Error(`Nudging 'currentTime' from ${currentTime} to ${targetTime}`);
			this.warn(error.message);
			media.currentTime = targetTime;
			hls.trigger(Events.ERROR, {
				type: ErrorTypes.MEDIA_ERROR,
				details: ErrorDetails.BUFFER_NUDGE_ON_STALL,
				error,
				fatal: false,
				buffer: bufferInfo.len,
				bufferInfo
			});
		} else {
			const error = /* @__PURE__ */ new Error(`Playhead still not moving while enough data buffered @${currentTime} after ${config.nudgeMaxRetry} nudges`);
			this.error(error.message);
			hls.trigger(Events.ERROR, {
				type: ErrorTypes.MEDIA_ERROR,
				details: ErrorDetails.BUFFER_STALLED_ERROR,
				error,
				fatal: true,
				buffer: bufferInfo.len,
				bufferInfo
			});
		}
	}
};
function getInFlightDependency(inFlightFragments, currentTime) {
	const main = inFlight(inFlightFragments.main);
	if (main && main.start <= currentTime) return main;
	const audio = inFlight(inFlightFragments.audio);
	if (audio && audio.start <= currentTime) return audio;
	return null;
}
function inFlight(inFlightData) {
	if (!inFlightData) return null;
	switch (inFlightData.state) {
		case State.IDLE:
		case State.STOPPED:
		case State.ENDED:
		case State.ERROR: return null;
	}
	return inFlightData.frag;
}
function appendedFragAtPosition(pos, fragmentTracker) {
	return fragmentTracker.getAppendedFrag(pos, PlaylistLevelType.MAIN) || fragmentTracker.getPartialFragment(pos);
}
function withInterstitialBoundary(bufferInfo, currentTime, fragmentTracker, hls) {
	hls.latestLevelDetails;
	appendedFragAtPosition(currentTime, fragmentTracker);
	if (interstitialsEnabled(hls.config));
}
var MetadataSchema = /*#__PURE__*/ function(MetadataSchema) {
	MetadataSchema["audioId3"] = "org.id3";
	MetadataSchema["dateRange"] = "com.apple.quicktime.HLS";
	MetadataSchema["emsg"] = "https://aomedia.org/emsg/ID3";
	MetadataSchema["misbklv"] = "urn:misb:KLV:bin:1910.1";
	return MetadataSchema;
}({});
function createTrackNode(videoEl, kind, label, lang = "", mode = "disabled") {
	const el = videoEl.ownerDocument.createElement("track");
	el.kind = kind;
	el.label = label;
	if (lang) el.srclang = lang;
	el.src = "data:,WEBVTT";
	el.track.mode = mode;
	videoEl.appendChild(el);
	return el;
}
function removeCuesInRange(track, start, end, predicate) {
	const mode = track.mode;
	if (mode === "disabled") track.mode = "hidden";
	if (track.cues && track.cues.length > 0) {
		const cues = getCuesInRange(track.cues, start, end);
		for (let i = 0; i < cues.length; i++) if (!predicate || predicate(cues[i])) track.removeCue(cues[i]);
	}
	if (mode === "disabled") track.mode = mode;
}
function getFirstCueIndexFromTime(cues, time) {
	if (time <= cues[0].startTime) return 0;
	const len = cues.length - 1;
	if (time > cues[len].endTime) return -1;
	let left = 0;
	let right = len;
	let mid;
	while (left <= right) {
		mid = Math.floor((right + left) / 2);
		if (time < cues[mid].startTime) right = mid - 1;
		else if (time > cues[mid].startTime && left < len) left = mid + 1;
		else return mid;
	}
	return cues[left].startTime - time < time - cues[right].startTime ? left : right;
}
function getCuesInRange(cues, start, end) {
	const cuesFound = [];
	const firstCueInRange = getFirstCueIndexFromTime(cues, start);
	if (firstCueInRange > -1) for (let i = firstCueInRange, len = cues.length; i < len; i++) {
		const cue = cues[i];
		if (cue.startTime >= start && cue.endTime <= end) cuesFound.push(cue);
		else if (cue.startTime > end) return cuesFound;
	}
	return cuesFound;
}
var MIN_CUE_DURATION = .25;
function getCueClass() {
	if (typeof self === "undefined") return void 0;
	return self.VTTCue || self.TextTrackCue;
}
function createCueWithDataFields(Cue, startTime, endTime, data, type) {
	let cue = new Cue(startTime, endTime, "");
	try {
		cue.value = data;
		if (type) cue.type = type;
	} catch (e) {
		cue = new Cue(startTime, endTime, stringify(type ? _objectSpread2({ type }, data) : data));
	}
	return cue;
}
var MAX_CUE_ENDTIME = (() => {
	const Cue = getCueClass();
	try {
		Cue && new Cue(0, Number.POSITIVE_INFINITY, "");
	} catch (e) {
		return Number.MAX_VALUE;
	}
	return Number.POSITIVE_INFINITY;
})();
var ID3TrackController = class {
	constructor(hls) {
		this.hls = void 0;
		this.id3Track = null;
		this.media = null;
		this.dateRangeCuesAppended = {};
		this.removeCues = true;
		this.assetCue = void 0;
		this.onEventCueEnter = () => {
			if (!this.hls) return;
			this.hls.trigger(Events.EVENT_CUE_ENTER, {});
		};
		this.hls = hls;
		this._registerListeners();
	}
	destroy() {
		this._unregisterListeners();
		this.id3Track = null;
		this.media = null;
		this.dateRangeCuesAppended = {};
		this.hls = this.onEventCueEnter = null;
	}
	_registerListeners() {
		const { hls } = this;
		if (hls) {
			hls.on(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
			hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
			hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
			hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
			hls.on(Events.FRAG_PARSING_METADATA, this.onFragParsingMetadata, this);
			hls.on(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
			hls.on(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
			hls.on(Events.LEVEL_PTS_UPDATED, this.onLevelPtsUpdated, this);
		}
	}
	_unregisterListeners() {
		const { hls } = this;
		if (hls) {
			hls.off(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
			hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
			hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
			hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
			hls.off(Events.FRAG_PARSING_METADATA, this.onFragParsingMetadata, this);
			hls.off(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
			hls.off(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
			hls.off(Events.LEVEL_PTS_UPDATED, this.onLevelPtsUpdated, this);
		}
	}
	onMediaAttaching(event, data) {
		this.media = data.media;
	}
	onMediaAttached() {
		var _this$hls;
		const details = (_this$hls = this.hls) == null ? void 0 : _this$hls.latestLevelDetails;
		if (details) this.updateDateRangeCues(details);
	}
	onMediaDetaching(event, data) {
		this.media = null;
		if (!!data.transferMedia) return;
		if (this.id3Track) {
			this.id3Track.remove();
			this.id3Track = null;
		}
		this.dateRangeCuesAppended = {};
	}
	onManifestLoading() {
		this.dateRangeCuesAppended = {};
	}
	createTrack(media) {
		return createTrackNode(media, "metadata", "id3", "", "hidden");
	}
	onFragParsingMetadata(event, data) {
		if (!this.media || !this.hls) return;
		const { enableEmsgMetadataCues, enableID3MetadataCues } = this.hls.config;
		if (!enableEmsgMetadataCues && !enableID3MetadataCues) return;
		const { samples } = data;
		if (!this.id3Track) this.id3Track = this.createTrack(this.media);
		const Cue = getCueClass();
		if (!Cue) return;
		for (let i = 0; i < samples.length; i++) {
			const type = samples[i].type;
			if (type === MetadataSchema.emsg && !enableEmsgMetadataCues || !enableID3MetadataCues) continue;
			const frames = getId3Frames(samples[i].data);
			const startTime = samples[i].pts;
			let endTime = startTime + samples[i].duration;
			if (endTime > MAX_CUE_ENDTIME) endTime = MAX_CUE_ENDTIME;
			if (endTime - startTime <= 0) endTime = startTime + MIN_CUE_DURATION;
			for (let j = 0; j < frames.length; j++) {
				const frame = frames[j];
				if (!isId3TimestampFrame(frame)) {
					this.updateId3CueEnds(startTime, type);
					const cue = createCueWithDataFields(Cue, startTime, endTime, frame, type);
					if (cue) this.id3Track.track.addCue(cue);
				}
			}
		}
	}
	updateId3CueEnds(startTime, type) {
		var _this$id3Track;
		const cues = (_this$id3Track = this.id3Track) == null ? void 0 : _this$id3Track.track.cues;
		if (cues) for (let i = cues.length; i--;) {
			const cue = cues[i];
			if (cue.type === type && cue.startTime < startTime && cue.endTime === MAX_CUE_ENDTIME) cue.endTime = startTime;
		}
	}
	onBufferFlushing(event, { startOffset, endOffset, type }) {
		const { id3Track, hls } = this;
		if (!hls) return;
		const { config: { enableEmsgMetadataCues, enableID3MetadataCues } } = hls;
		if (id3Track && (enableEmsgMetadataCues || enableID3MetadataCues)) {
			let predicate;
			if (type === "audio") predicate = (cue) => cue.type === MetadataSchema.audioId3 && enableID3MetadataCues;
			else if (type === "video") predicate = (cue) => cue.type === MetadataSchema.emsg && enableEmsgMetadataCues;
			else predicate = (cue) => cue.type === MetadataSchema.audioId3 && enableID3MetadataCues || cue.type === MetadataSchema.emsg && enableEmsgMetadataCues;
			removeCuesInRange(id3Track.track, startOffset, endOffset, predicate);
		}
	}
	onLevelUpdated(event, { details }) {
		this.updateDateRangeCues(details, true);
	}
	onLevelPtsUpdated(event, data) {
		if (Math.abs(data.drift) > .01) this.updateDateRangeCues(data.details);
	}
	updateDateRangeCues(details, removeOldCues) {
		if (!this.hls || !this.media) return;
		const { assetPlayerId, timelineOffset, enableDateRangeMetadataCues, interstitialsController } = this.hls.config;
		if (!enableDateRangeMetadataCues) return;
		const Cue = getCueClass();
		if (!details.hasProgramDateTime) return;
		const { id3Track } = this;
		const { dateRanges } = details;
		const ids = Object.keys(dateRanges);
		let dateRangeCuesAppended = this.dateRangeCuesAppended;
		if (id3Track && removeOldCues) {
			var _id3Track$track$cues;
			if ((_id3Track$track$cues = id3Track.track.cues) != null && _id3Track$track$cues.length) {
				const idsToRemove = Object.keys(dateRangeCuesAppended).filter((id) => ids.indexOf(id) === -1);
				for (let i = idsToRemove.length; i--;) {
					var _dateRangeCuesAppende;
					const id = idsToRemove[i];
					const cues = (_dateRangeCuesAppende = dateRangeCuesAppended[id]) == null ? void 0 : _dateRangeCuesAppende.cues;
					delete dateRangeCuesAppended[id];
					if (cues) Object.keys(cues).forEach((key) => {
						const cue = cues[key];
						if (cue) {
							cue.removeEventListener("enter", this.onEventCueEnter);
							try {
								id3Track.track.removeCue(cue);
							} catch (e) {}
						}
					});
				}
			} else dateRangeCuesAppended = this.dateRangeCuesAppended = {};
		}
		const lastFragment = details.fragments[details.fragments.length - 1];
		if (ids.length === 0 || !isFiniteNumber(lastFragment == null ? void 0 : lastFragment.programDateTime)) return;
		this.id3Track || (this.id3Track = this.createTrack(this.media));
		for (let i = 0; i < ids.length; i++) {
			const id = ids[i];
			const dateRange = dateRanges[id];
			const startTime = dateRange.startTime;
			const appendedDateRangeCues = dateRangeCuesAppended[id];
			const cues = (appendedDateRangeCues == null ? void 0 : appendedDateRangeCues.cues) || {};
			let durationKnown = (appendedDateRangeCues == null ? void 0 : appendedDateRangeCues.durationKnown) || false;
			let endTime = MAX_CUE_ENDTIME;
			const { duration, endDate } = dateRange;
			if (endDate && duration !== null) {
				endTime = startTime + duration;
				durationKnown = true;
			} else if (dateRange.endOnNext && !durationKnown) {
				const nextDateRangeWithSameClass = ids.reduce((candidateDateRange, id) => {
					if (id !== dateRange.id) {
						const otherDateRange = dateRanges[id];
						if (otherDateRange.class === dateRange.class && otherDateRange.startDate > dateRange.startDate && (!candidateDateRange || dateRange.startDate < candidateDateRange.startDate)) return otherDateRange;
					}
					return candidateDateRange;
				}, null);
				if (nextDateRangeWithSameClass) {
					endTime = nextDateRangeWithSameClass.startTime;
					durationKnown = true;
				}
			}
			const attributes = Object.keys(dateRange.attr);
			for (let j = 0; j < attributes.length; j++) {
				const key = attributes[j];
				if (!isDateRangeCueAttribute(key)) continue;
				const cue = cues[key];
				if (cue) {
					if (durationKnown && !(appendedDateRangeCues != null && appendedDateRangeCues.durationKnown)) cue.endTime = endTime;
					else if (Math.abs(cue.startTime - startTime) > .01) {
						cue.startTime = startTime;
						cue.endTime = endTime;
					}
				} else if (Cue) {
					let data = dateRange.attr[key];
					if (isSCTE35Attribute(key)) data = hexToArrayBuffer(data);
					const _cue = createCueWithDataFields(Cue, startTime, endTime, {
						key,
						data
					}, MetadataSchema.dateRange);
					if (_cue) {
						_cue.id = id;
						this.id3Track.track.addCue(_cue);
						cues[key] = _cue;
					}
				}
			}
			dateRangeCuesAppended[id] = {
				cues,
				dateRange,
				durationKnown
			};
		}
	}
};
var LatencyController = class {
	constructor(hls) {
		this.hls = void 0;
		this.media = null;
		this.currentTime = 0;
		this.stallCount = 0;
		this._latency = null;
		this._targetLatencyUpdated = false;
		this.onTimeupdate = () => {
			const { media } = this;
			const levelDetails = this.levelDetails;
			if (!media || !levelDetails || !this.hls) return;
			this.currentTime = media.currentTime;
			const config = this.hls.config;
			const latency = this.computeLatency();
			if (latency === null) return;
			this._latency = latency;
			const { lowLatencyMode, maxLiveSyncPlaybackRate } = config;
			if (!lowLatencyMode || maxLiveSyncPlaybackRate === 1 || !levelDetails.live) return;
			const targetLatency = this.targetLatency;
			if (targetLatency === null) return;
			const distanceFromTarget = latency - targetLatency;
			if (distanceFromTarget < Math.min(this.maxLatency, targetLatency + levelDetails.targetduration) && distanceFromTarget > .05 && this.forwardBufferLength > 1 && true) {
				const max = Math.min(2, Math.max(1, maxLiveSyncPlaybackRate));
				const rate = Math.round(2 / (1 + Math.exp(-.75 * distanceFromTarget - this.edgeStalled)) * 20) / 20;
				const playbackRate = Math.min(max, Math.max(1, rate));
				this.changeMediaPlaybackRate(media, playbackRate);
			} else if (media.playbackRate !== 1 && media.playbackRate !== 0) this.changeMediaPlaybackRate(media, 1);
		};
		this.hls = hls;
		this.registerListeners();
	}
	get levelDetails() {
		var _this$hls;
		return ((_this$hls = this.hls) == null ? void 0 : _this$hls.latestLevelDetails) || null;
	}
	get latency() {
		return this._latency || 0;
	}
	get maxLatency() {
		var _this$hls2;
		const config = (_this$hls2 = this.hls) == null ? void 0 : _this$hls2.config;
		if (!config) return 0;
		if (config.liveMaxLatencyDuration !== void 0) return config.liveMaxLatencyDuration;
		const levelDetails = this.levelDetails;
		return levelDetails ? config.liveMaxLatencyDurationCount * levelDetails.targetduration : 0;
	}
	get targetLatency() {
		const levelDetails = this.levelDetails;
		if (levelDetails === null || !this.hls) return null;
		const config = this.hls.config;
		const { holdBack, partHoldBack, targetduration } = levelDetails;
		const { liveSyncDuration, liveSyncDurationCount, lowLatencyMode } = config;
		const userConfig = this.hls.userConfig;
		let targetLatency = lowLatencyMode ? partHoldBack || holdBack : holdBack;
		if (this._targetLatencyUpdated || userConfig.liveSyncDuration || userConfig.liveSyncDurationCount || targetLatency === 0) targetLatency = liveSyncDuration !== void 0 ? liveSyncDuration : liveSyncDurationCount * targetduration;
		const maxLiveSyncOnStallIncrease = targetduration;
		return targetLatency + Math.min(this.stallCount * config.liveSyncOnStallIncrease, maxLiveSyncOnStallIncrease);
	}
	set targetLatency(latency) {
		if (!this.hls) return;
		this.stallCount = 0;
		this.hls.config.liveSyncDuration = latency;
		this._targetLatencyUpdated = true;
	}
	get liveSyncPosition() {
		const liveEdge = this.estimateLiveEdge();
		const targetLatency = this.targetLatency;
		if (liveEdge === null || targetLatency === null || !this.hls) return null;
		const levelDetails = this.levelDetails;
		if (levelDetails === null) return null;
		const edge = levelDetails.edge;
		const syncPosition = liveEdge - targetLatency - this.edgeStalled;
		const min = edge - levelDetails.totalduration;
		const max = edge - (this.hls.config.lowLatencyMode && levelDetails.partTarget || levelDetails.targetduration);
		return Math.min(Math.max(min, syncPosition), max);
	}
	get drift() {
		const levelDetails = this.levelDetails;
		if (levelDetails === null) return 1;
		return levelDetails.drift;
	}
	get edgeStalled() {
		const levelDetails = this.levelDetails;
		if (levelDetails === null || !this.hls) return 0;
		const maxLevelUpdateAge = (this.hls.config.lowLatencyMode && levelDetails.partTarget || levelDetails.targetduration) * 3;
		return Math.max(levelDetails.age - maxLevelUpdateAge, 0);
	}
	get forwardBufferLength() {
		const { media } = this;
		const levelDetails = this.levelDetails;
		if (!media || !levelDetails) return 0;
		const bufferedRanges = media.buffered.length;
		return (bufferedRanges ? media.buffered.end(bufferedRanges - 1) : levelDetails.edge) - this.currentTime;
	}
	destroy() {
		this.unregisterListeners();
		this.onMediaDetaching();
		this.hls = null;
	}
	registerListeners() {
		const { hls } = this;
		if (!hls) return;
		hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
		hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
		hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.on(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
		hls.on(Events.ERROR, this.onError, this);
		hls.on(Events.INTERSTITIAL_ASSET_STARTED, this.onAssetStarted, this);
	}
	unregisterListeners() {
		const { hls } = this;
		if (!hls) return;
		hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
		hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
		hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.off(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
		hls.off(Events.ERROR, this.onError, this);
		hls.off(Events.INTERSTITIAL_ASSET_STARTED, this.onAssetStarted, this);
	}
	onMediaAttached(event, data) {
		this.media = data.media;
		this.media.addEventListener("timeupdate", this.onTimeupdate);
	}
	onMediaDetaching() {
		if (this.media) {
			this.media.removeEventListener("timeupdate", this.onTimeupdate);
			this.media = null;
		}
	}
	onManifestLoading() {
		this._latency = null;
		this.stallCount = 0;
	}
	onLevelUpdated(event, { details }) {
		if (details.advanced) this.onTimeupdate();
		if (!details.live && this.media) this.media.removeEventListener("timeupdate", this.onTimeupdate);
	}
	onAssetStarted(event, data) {
		var _hls$interstitialsMan;
		const hls = this.hls;
		const media = this.media || data.event.appendInPlace && (hls == null || (_hls$interstitialsMan = hls.interstitialsManager) == null ? void 0 : _hls$interstitialsMan.playerQueue.reduce((found, player) => found || player.media, null));
		if (hls && media && media.playbackRate > 1 && media.playbackRate <= hls.config.maxLiveSyncPlaybackRate) this.changeMediaPlaybackRate(media, 1);
	}
	onError(event, data) {
		var _this$levelDetails;
		if (data.details !== ErrorDetails.BUFFER_STALLED_ERROR) return;
		this.stallCount++;
		if (this.hls && (_this$levelDetails = this.levelDetails) != null && _this$levelDetails.live) this.hls.logger.warn("[latency-controller]: Stall detected, adjusting target latency");
	}
	changeMediaPlaybackRate(media, playbackRate) {
		var _this$hls3, _this$targetLatency;
		if (media.playbackRate === playbackRate) return;
		(_this$hls3 = this.hls) == null || _this$hls3.logger.debug(`[latency-controller]: latency=${this.latency.toFixed(3)}, targetLatency=${(_this$targetLatency = this.targetLatency) == null ? void 0 : _this$targetLatency.toFixed(3)}, forwardBufferLength=${this.forwardBufferLength.toFixed(3)}: adjusting playback rate from ${media.playbackRate} to ${playbackRate}`);
		media.playbackRate = playbackRate;
	}
	estimateLiveEdge() {
		const levelDetails = this.levelDetails;
		if (levelDetails === null) return null;
		return levelDetails.edge + levelDetails.age;
	}
	computeLatency() {
		const liveEdge = this.estimateLiveEdge();
		if (liveEdge === null) return null;
		return liveEdge - this.currentTime;
	}
};
var version = "1.7.4";
var workerStore = {};
function hasUMDWorker() {
	return typeof __HLS_WORKER_BUNDLE__ === "function";
}
function injectWorker() {
	const workerContext = workerStore[version];
	if (workerContext) {
		workerContext.clientCount++;
		return workerContext;
	}
	const blob = new self.Blob([`var exports={};var module={exports:exports};function define(f){f()};define.amd=true;(${__HLS_WORKER_BUNDLE__.toString()})(true);`], { type: "text/javascript" });
	const objectURL = self.URL.createObjectURL(blob);
	const result = {
		worker: new self.Worker(objectURL),
		objectURL,
		clientCount: 1
	};
	workerStore[version] = result;
	return result;
}
function loadWorker(path) {
	const workerContext = workerStore[path];
	if (workerContext) {
		workerContext.clientCount++;
		return workerContext;
	}
	const scriptURL = new self.URL(path, self.location.href).href;
	const result = {
		worker: new self.Worker(scriptURL),
		scriptURL,
		clientCount: 1
	};
	workerStore[path] = result;
	return result;
}
function removeWorkerFromStore(path) {
	const workerContext = workerStore[path || version];
	if (workerContext) {
		if (workerContext.clientCount-- === 1) {
			const { worker, objectURL } = workerContext;
			delete workerStore[path || version];
			if (objectURL) self.URL.revokeObjectURL(objectURL);
			worker.terminate();
		}
	}
}
function getAudioConfig(observer, data, offset, manifestCodec) {
	const adtsSamplingRates = [
		96e3,
		88200,
		64e3,
		48e3,
		44100,
		32e3,
		24e3,
		22050,
		16e3,
		12e3,
		11025,
		8e3,
		7350
	];
	const byte2 = data[offset + 2];
	const adtsSamplingIndex = byte2 >> 2 & 15;
	if (adtsSamplingIndex > 12) {
		const error = /* @__PURE__ */ new Error(`invalid ADTS sampling index:${adtsSamplingIndex}`);
		observer.emit(Events.ERROR, Events.ERROR, {
			type: ErrorTypes.MEDIA_ERROR,
			details: ErrorDetails.FRAG_PARSING_ERROR,
			fatal: true,
			error,
			reason: error.message
		});
		return;
	}
	const adtsObjectType = (byte2 >> 6 & 3) + 1;
	const channelCount = data[offset + 3] >> 6 & 3 | (byte2 & 1) << 2;
	const samplerate = adtsSamplingRates[adtsSamplingIndex];
	let aacSampleIndex = adtsSamplingIndex;
	if (adtsObjectType === 5 || adtsObjectType === 29) aacSampleIndex -= 3;
	let config;
	const samplingIndexHigh = (aacSampleIndex & 14) >> 1;
	const samplingIndexLowAndChannels = (aacSampleIndex & 1) << 7 | channelCount << 3;
	let adtsOverride = 0;
	if (adtsObjectType === 1 && adtsSamplingIndex >= 6) {
		adtsOverride = 5;
		const adtsExtensionSamplingIndex = adtsSamplingIndex - 3;
		config = [
			adtsOverride << 3 | samplingIndexHigh,
			samplingIndexLowAndChannels | (adtsExtensionSamplingIndex & 14) >> 1,
			(adtsExtensionSamplingIndex & 1) << 7 | 8,
			0
		];
	} else config = [adtsObjectType << 3 | samplingIndexHigh, samplingIndexLowAndChannels];
	const codec = "mp4a.40." + (adtsOverride || adtsObjectType);
	logger.log(`manifest codec:${manifestCodec}, parsed codec:${codec}, channels:${channelCount}, rate:${samplerate} (ADTS object type:${adtsObjectType} sampling index:${adtsSamplingIndex} esds config:[${config.join(",")}])`);
	return {
		config,
		samplerate,
		channelCount,
		codec,
		parsedCodec: codec,
		manifestCodec
	};
}
function isHeaderPattern$1(data, offset) {
	return data[offset] === 255 && (data[offset + 1] & 246) === 240;
}
function getHeaderLength(data, offset) {
	return data[offset + 1] & 1 ? 7 : 9;
}
function getFullFrameLength(data, offset) {
	return (data[offset + 3] & 3) << 11 | data[offset + 4] << 3 | (data[offset + 5] & 224) >>> 5;
}
function canGetFrameLength(data, offset) {
	return offset + 5 < data.length;
}
function isHeader$1(data, offset) {
	return offset + 1 < data.length && isHeaderPattern$1(data, offset);
}
function canParse$1(data, offset) {
	return canGetFrameLength(data, offset) && isHeaderPattern$1(data, offset) && getFullFrameLength(data, offset) <= data.length - offset;
}
function probe$1(data, offset) {
	if (isHeader$1(data, offset)) {
		const headerLength = getHeaderLength(data, offset);
		if (offset + headerLength >= data.length) return false;
		const frameLength = getFullFrameLength(data, offset);
		if (frameLength <= headerLength) return false;
		const newOffset = offset + frameLength;
		return newOffset === data.length || isHeader$1(data, newOffset);
	}
	return false;
}
function initTrackConfig(track, observer, data, offset, audioCodec) {
	if (!track.samplerate) {
		const config = getAudioConfig(observer, data, offset, audioCodec);
		if (!config) return;
		_extends(track, config);
	}
}
function getFrameDuration(samplerate) {
	return 9216e4 / samplerate;
}
function parseFrameHeader(data, offset) {
	const headerLength = getHeaderLength(data, offset);
	if (offset + headerLength <= data.length) {
		const frameLength = getFullFrameLength(data, offset) - headerLength;
		if (frameLength > 0) return {
			headerLength,
			frameLength
		};
	}
}
function appendFrame$1(track, data, offset, pts, frameIndex) {
	const stamp = pts + frameIndex * getFrameDuration(track.samplerate);
	const header = parseFrameHeader(data, offset);
	let unit;
	if (header) {
		const { frameLength, headerLength } = header;
		const _length = headerLength + frameLength;
		const missing = Math.max(0, offset + _length - data.length);
		if (missing) {
			unit = new Uint8Array(_length - headerLength);
			unit.set(data.subarray(offset + headerLength, data.length), 0);
		} else unit = data.subarray(offset + headerLength, offset + _length);
		const _sample = {
			unit,
			pts: stamp
		};
		if (!missing) track.samples.push(_sample);
		return {
			sample: _sample,
			length: _length,
			missing
		};
	}
	const length = data.length - offset;
	unit = new Uint8Array(length);
	unit.set(data.subarray(offset, data.length), 0);
	return {
		sample: {
			unit,
			pts: stamp
		},
		length,
		missing: -1
	};
}
function dummyTrack(type = "", inputTimeScale = 9e4) {
	return {
		type,
		id: -1,
		pid: -1,
		inputTimeScale,
		sequenceNumber: -1,
		samples: [],
		dropped: 0
	};
}
var BaseAudioDemuxer = class {
	constructor() {
		this._audioTrack = void 0;
		this._id3Track = void 0;
		this.frameIndex = 0;
		this.cachedData = null;
		this.basePTS = null;
		this.initPTS = null;
		this.lastPTS = null;
	}
	resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration) {
		this._id3Track = {
			type: "id3",
			id: 3,
			pid: -1,
			inputTimeScale: 9e4,
			sequenceNumber: 0,
			samples: [],
			dropped: 0
		};
	}
	resetTimeStamp(deaultTimestamp) {
		this.initPTS = deaultTimestamp;
		this.resetContiguity();
	}
	resetContiguity() {
		this.basePTS = null;
		this.lastPTS = null;
		this.frameIndex = 0;
	}
	canParse(data, offset) {
		return false;
	}
	appendFrame(track, data, offset) {}
	demux(data, timeOffset) {
		if (this.cachedData) {
			data = appendUint8Array(this.cachedData, data);
			this.cachedData = null;
		}
		let id3Data = getId3Data(data, 0);
		let offset = id3Data ? id3Data.length : 0;
		let lastDataIndex;
		const track = this._audioTrack;
		const id3Track = this._id3Track;
		const timestamp = id3Data ? getId3Timestamp(id3Data) : void 0;
		const length = data.length;
		if (this.basePTS === null || this.frameIndex === 0 && isFiniteNumber(timestamp)) {
			this.basePTS = initPTSFn(timestamp, timeOffset, this.initPTS);
			this.lastPTS = this.basePTS;
		}
		if (this.lastPTS === null) this.lastPTS = this.basePTS;
		if (id3Data && id3Data.length > 0) id3Track.samples.push({
			pts: this.lastPTS,
			dts: this.lastPTS,
			data: id3Data,
			type: MetadataSchema.audioId3,
			duration: Number.POSITIVE_INFINITY
		});
		while (offset < length) {
			if (this.canParse(data, offset)) {
				const frame = this.appendFrame(track, data, offset);
				if (frame) {
					this.frameIndex++;
					this.lastPTS = frame.sample.pts;
					offset += frame.length;
					lastDataIndex = offset;
				} else offset = length;
			} else if (canParseId3(data, offset)) {
				id3Data = getId3Data(data, offset);
				id3Track.samples.push({
					pts: this.lastPTS,
					dts: this.lastPTS,
					data: id3Data,
					type: MetadataSchema.audioId3,
					duration: Number.POSITIVE_INFINITY
				});
				offset += id3Data.length;
				lastDataIndex = offset;
			} else offset++;
			if (offset === length && lastDataIndex !== length) {
				const partialData = data.slice(lastDataIndex);
				if (this.cachedData) this.cachedData = appendUint8Array(this.cachedData, partialData);
				else this.cachedData = partialData;
			}
		}
		return {
			audioTrack: track,
			videoTrack: dummyTrack(),
			id3Track,
			textTrack: dummyTrack()
		};
	}
	demuxSampleAes(data, keyData, timeOffset) {
		return Promise.reject(/* @__PURE__ */ new Error(`[${this}] This demuxer does not support Sample-AES decryption`));
	}
	flush(timeOffset) {
		const cachedData = this.cachedData;
		if (cachedData) {
			this.cachedData = null;
			this.demux(cachedData, 0);
		}
		return {
			audioTrack: this._audioTrack,
			videoTrack: dummyTrack(),
			id3Track: this._id3Track,
			textTrack: dummyTrack()
		};
	}
	destroy() {
		this.cachedData = null;
		this._audioTrack = this._id3Track = void 0;
	}
};
/**
* Initialize PTS
* <p>
*    use timestamp unless it is undefined, NaN or Infinity
* </p>
*/
var initPTSFn = (timestamp, timeOffset, initPTS) => {
	if (isFiniteNumber(timestamp)) return timestamp * 90;
	const init90kHz = initPTS ? initPTS.baseTime * 9e4 / initPTS.timescale : 0;
	return timeOffset * 9e4 + init90kHz;
};
/**
*  MPEG parser helper
*/
var BitratesMap = [
	32,
	64,
	96,
	128,
	160,
	192,
	224,
	256,
	288,
	320,
	352,
	384,
	416,
	448,
	32,
	48,
	56,
	64,
	80,
	96,
	112,
	128,
	160,
	192,
	224,
	256,
	320,
	384,
	32,
	40,
	48,
	56,
	64,
	80,
	96,
	112,
	128,
	160,
	192,
	224,
	256,
	320,
	32,
	48,
	56,
	64,
	80,
	96,
	112,
	128,
	144,
	160,
	176,
	192,
	224,
	256,
	8,
	16,
	24,
	32,
	40,
	48,
	56,
	64,
	80,
	96,
	112,
	128,
	144,
	160
];
var SamplingRateMap = [
	44100,
	48e3,
	32e3,
	22050,
	24e3,
	16e3,
	11025,
	12e3,
	8e3
];
var SamplesCoefficients = [
	[
		0,
		72,
		144,
		12
	],
	[
		0,
		0,
		0,
		0
	],
	[
		0,
		72,
		144,
		12
	],
	[
		0,
		144,
		144,
		12
	]
];
var BytesInSlot = [
	0,
	1,
	1,
	4
];
function appendFrame(track, data, offset, pts, frameIndex) {
	if (offset + 24 > data.length) return;
	const header = parseHeader(data, offset);
	if (header && offset + header.frameLength <= data.length) {
		const stamp = pts + frameIndex * (header.samplesPerFrame * 9e4 / header.sampleRate);
		const sample = {
			unit: data.subarray(offset, offset + header.frameLength),
			pts: stamp,
			dts: stamp
		};
		track.config = [];
		track.channelCount = header.channelCount;
		track.samplerate = header.sampleRate;
		track.samples.push(sample);
		return {
			sample,
			length: header.frameLength,
			missing: 0
		};
	}
}
function parseHeader(data, offset) {
	const mpegVersion = data[offset + 1] >> 3 & 3;
	const mpegLayer = data[offset + 1] >> 1 & 3;
	const bitRateIndex = data[offset + 2] >> 4 & 15;
	const sampleRateIndex = data[offset + 2] >> 2 & 3;
	if (mpegVersion !== 1 && bitRateIndex !== 0 && bitRateIndex !== 15 && sampleRateIndex !== 3) {
		const paddingBit = data[offset + 2] >> 1 & 1;
		const channelMode = data[offset + 3] >> 6;
		const bitRate = BitratesMap[(mpegVersion === 3 ? 3 - mpegLayer : mpegLayer === 3 ? 3 : 4) * 14 + bitRateIndex - 1] * 1e3;
		const sampleRate = SamplingRateMap[(mpegVersion === 3 ? 0 : mpegVersion === 2 ? 1 : 2) * 3 + sampleRateIndex];
		const channelCount = channelMode === 3 ? 1 : 2;
		const sampleCoefficient = SamplesCoefficients[mpegVersion][mpegLayer];
		const bytesInSlot = BytesInSlot[mpegLayer];
		const samplesPerFrame = sampleCoefficient * 8 * bytesInSlot;
		const frameLength = Math.floor(sampleCoefficient * bitRate / sampleRate + paddingBit) * bytesInSlot;
		const chromeVersion = userAgentChromeVersion();
		if (!!chromeVersion && chromeVersion <= 87 && mpegLayer === 2 && bitRate >= 224e3 && channelMode === 0) data[offset + 3] = data[offset + 3] | 128;
		return {
			sampleRate,
			channelCount,
			frameLength,
			samplesPerFrame
		};
	}
}
function isHeaderPattern(data, offset) {
	return data[offset] === 255 && (data[offset + 1] & 224) === 224 && (data[offset + 1] & 6) !== 0;
}
function isHeader(data, offset) {
	return offset + 1 < data.length && isHeaderPattern(data, offset);
}
function canParse(data, offset) {
	return isHeaderPattern(data, offset) && 4 <= data.length - offset;
}
function probe(data, offset) {
	if (offset + 1 < data.length && isHeaderPattern(data, offset)) {
		const headerLength = 4;
		const header = parseHeader(data, offset);
		let frameLength = headerLength;
		if (header != null && header.frameLength) frameLength = header.frameLength;
		const newOffset = offset + frameLength;
		return newOffset === data.length || isHeader(data, newOffset);
	}
	return false;
}
/**
* SAMPLE-AES decrypter
*/
var SampleAesDecrypter = class {
	constructor(observer, config, keyData) {
		this.keyData = void 0;
		this.decrypter = void 0;
		this.keyData = keyData;
		this.decrypter = new Decrypter(config, true);
	}
	decryptBuffer(encryptedData) {
		return this.decrypter.decrypt(encryptedData, this.keyData.key.buffer, this.keyData.iv.buffer, DecrypterAesMode.cbc, {
			start: 0,
			end: encryptedData.byteLength
		});
	}
	decryptAacSample(samples, sampleIndex, callback) {
		const curUnit = samples[sampleIndex].unit;
		if (curUnit.length <= 16) return;
		const encryptedData = curUnit.subarray(16, curUnit.length - curUnit.length % 16);
		const encryptedBuffer = encryptedData.buffer.slice(encryptedData.byteOffset, encryptedData.byteOffset + encryptedData.length);
		this.decryptBuffer(encryptedBuffer).then((decryptedBuffer) => {
			const decryptedData = new Uint8Array(decryptedBuffer);
			curUnit.set(decryptedData, 16);
			if (!this.decrypter.isSync()) this.decryptAacSamples(samples, sampleIndex + 1, callback);
		}).catch(callback);
	}
	decryptAacSamples(samples, sampleIndex, callback) {
		for (;; sampleIndex++) {
			if (sampleIndex >= samples.length) {
				callback();
				return;
			}
			if (samples[sampleIndex].unit.length < 32) continue;
			this.decryptAacSample(samples, sampleIndex, callback);
			if (!this.decrypter.isSync()) return;
		}
	}
	getAvcEncryptedData(decodedData) {
		const encryptedDataLen = Math.floor((decodedData.length - 48) / 160) * 16 + 16;
		const encryptedData = new Int8Array(encryptedDataLen);
		let outputPos = 0;
		for (let inputPos = 32; inputPos < decodedData.length - 16; inputPos += 160, outputPos += 16) encryptedData.set(decodedData.subarray(inputPos, inputPos + 16), outputPos);
		return encryptedData;
	}
	getAvcDecryptedUnit(decodedData, decryptedData) {
		const uint8DecryptedData = new Uint8Array(decryptedData);
		let inputPos = 0;
		for (let outputPos = 32; outputPos < decodedData.length - 16; outputPos += 160, inputPos += 16) decodedData.set(uint8DecryptedData.subarray(inputPos, inputPos + 16), outputPos);
		return decodedData;
	}
	decryptAvcSample(samples, sampleIndex, unitIndex, callback, curUnit) {
		const decodedData = discardEPB(curUnit.data);
		const encryptedData = this.getAvcEncryptedData(decodedData);
		this.decryptBuffer(encryptedData.buffer).then((decryptedBuffer) => {
			curUnit.data = this.getAvcDecryptedUnit(decodedData, decryptedBuffer);
			if (!this.decrypter.isSync()) this.decryptAvcSamples(samples, sampleIndex, unitIndex + 1, callback);
		}).catch(callback);
	}
	decryptAvcSamples(samples, sampleIndex, unitIndex, callback) {
		if (samples instanceof Uint8Array) throw new Error("Cannot decrypt samples of type Uint8Array");
		for (;; sampleIndex++, unitIndex = 0) {
			if (sampleIndex >= samples.length) {
				callback();
				return;
			}
			const curUnits = samples[sampleIndex].units;
			for (;; unitIndex++) {
				if (unitIndex >= curUnits.length) break;
				const curUnit = curUnits[unitIndex];
				if (curUnit.data.length <= 48 || curUnit.type !== 1 && curUnit.type !== 5) continue;
				this.decryptAvcSample(samples, sampleIndex, unitIndex, callback, curUnit);
				if (!this.decrypter.isSync()) return;
			}
		}
	}
};
/**
* AAC demuxer
*/
var AACDemuxer = class extends BaseAudioDemuxer {
	constructor(observer, config) {
		super();
		this.observer = void 0;
		this.config = void 0;
		this.sampleAes = null;
		this.observer = observer;
		this.config = config;
	}
	resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration) {
		super.resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration);
		this._audioTrack = {
			container: "audio/adts",
			type: "audio",
			id: 2,
			pid: -1,
			sequenceNumber: 0,
			segmentCodec: "aac",
			samples: [],
			manifestCodec: audioCodec,
			duration: trackDuration,
			inputTimeScale: 9e4,
			dropped: 0
		};
	}
	static probe(data, logger) {
		if (!data) return false;
		const id3Data = getId3Data(data, 0);
		let offset = (id3Data == null ? void 0 : id3Data.length) || 0;
		if (probe(data, offset)) return false;
		for (let length = data.length; offset < length; offset++) if (probe$1(data, offset)) {
			logger.log("ADTS sync word found !");
			return true;
		}
		return false;
	}
	canParse(data, offset) {
		return canParse$1(data, offset);
	}
	appendFrame(track, data, offset) {
		initTrackConfig(track, this.observer, data, offset, track.manifestCodec);
		const frame = appendFrame$1(track, data, offset, this.basePTS, this.frameIndex);
		if ((frame == null ? void 0 : frame.missing) === 0) return frame;
	}
	demuxSampleAes(data, keyData, timeOffset) {
		const demuxResult = this.demux(data, timeOffset);
		const sampleAes = this.sampleAes = new SampleAesDecrypter(this.observer, this.config, keyData);
		return new Promise((resolve) => {
			sampleAes.decryptAacSamples(demuxResult.audioTrack.samples, 0, () => {
				resolve(demuxResult);
			});
		});
	}
};
var getAudioBSID = (data, offset) => {
	let bsid = 0;
	let numBits = 5;
	offset += numBits;
	const temp = /* @__PURE__ */ new Uint32Array(1);
	const mask = /* @__PURE__ */ new Uint32Array(1);
	const byte = /* @__PURE__ */ new Uint8Array(1);
	while (numBits > 0) {
		byte[0] = data[offset];
		const bits = Math.min(numBits, 8);
		const shift = 8 - bits;
		mask[0] = 4278190080 >>> 24 + shift << shift;
		temp[0] = (byte[0] & mask[0]) >> shift;
		bsid = !bsid ? temp[0] : bsid << bits | temp[0];
		offset += 1;
		numBits -= bits;
	}
	return bsid;
};
/**
* MP3 demuxer
*/
var MP3Demuxer = class extends BaseAudioDemuxer {
	resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration) {
		super.resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration);
		this._audioTrack = {
			container: "audio/mpeg",
			type: "audio",
			id: 2,
			pid: -1,
			sequenceNumber: 0,
			segmentCodec: "mp3",
			samples: [],
			manifestCodec: audioCodec,
			duration: trackDuration,
			inputTimeScale: 9e4,
			dropped: 0
		};
	}
	static probe(data) {
		if (!data) return false;
		const id3Data = getId3Data(data, 0);
		let offset = (id3Data == null ? void 0 : id3Data.length) || 0;
		if (id3Data && data[offset] === 11 && data[offset + 1] === 119 && getId3Timestamp(id3Data) !== void 0 && getAudioBSID(data, offset) <= 16) return false;
		for (let length = data.length; offset < length; offset++) if (probe(data, offset)) {
			logger.log("MPEG Audio sync word found !");
			return true;
		}
		return false;
	}
	canParse(data, offset) {
		return canParse(data, offset);
	}
	appendFrame(track, data, offset) {
		if (this.basePTS === null) return;
		return appendFrame(track, data, offset, this.basePTS, this.frameIndex);
	}
};
var emsgSchemePattern = /\/emsg[-/]ID3/i;
var MP4Demuxer = class {
	constructor(observer, config, typeSupported, logger$1 = logger) {
		this.remainderData = null;
		this.timeOffset = 0;
		this.config = void 0;
		this.videoTrack = void 0;
		this.audioTrack = void 0;
		this.id3Track = void 0;
		this.txtTrack = void 0;
		this.initData = void 0;
		this.logger = void 0;
		this.config = config;
		this.logger = logger$1;
	}
	resetTimeStamp() {}
	resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration) {
		const videoTrack = this.videoTrack = dummyTrack("video", 1);
		const audioTrack = this.audioTrack = dummyTrack("audio", 1);
		const captionTrack = this.txtTrack = dummyTrack("text", 1);
		this.id3Track = dummyTrack("id3", 1);
		this.initData = void 0;
		this.timeOffset = 0;
		if (!(initSegment != null && initSegment.byteLength)) return;
		const initData = this.initData = parseInitSegment(initSegment);
		if (initData.video) {
			const { id, timescale, codec, supplemental } = initData.video;
			videoTrack.id = id;
			videoTrack.timescale = captionTrack.timescale = timescale;
			videoTrack.codec = codec;
			videoTrack.supplemental = supplemental;
		}
		if (initData.audio) {
			const { id, timescale, codec } = initData.audio;
			audioTrack.id = id;
			audioTrack.timescale = timescale;
			audioTrack.codec = codec;
		}
		captionTrack.id = RemuxerTrackIdConfig.text;
		videoTrack.sampleDuration = 0;
		videoTrack.duration = audioTrack.duration = trackDuration;
	}
	resetContiguity() {
		this.remainderData = null;
	}
	static probe(data) {
		return hasBoxData(data, "moof");
	}
	demux(data, timeOffset, chunkMeta) {
		this.timeOffset = timeOffset;
		let videoSamples = data;
		const videoTrack = this.videoTrack;
		const textTrack = this.txtTrack;
		if (this.config.progressive) {
			if (this.remainderData) videoSamples = appendUint8Array(this.remainderData, data);
			const segmentedData = segmentValidRange(videoSamples);
			this.remainderData = segmentedData.remainder;
			videoTrack.samples = segmentedData.valid || /* @__PURE__ */ new Uint8Array();
		} else videoTrack.samples = videoSamples;
		const id3Track = this.extractID3Track(videoTrack, timeOffset);
		const sampleData = this.parseFragment(videoTrack, textTrack, timeOffset, chunkMeta);
		return {
			videoTrack,
			audioTrack: this.audioTrack,
			id3Track,
			textTrack: this.txtTrack,
			initData: this.initData,
			sampleData
		};
	}
	flush(_timeOffset, chunkMeta) {
		const timeOffset = this.timeOffset;
		const videoTrack = this.videoTrack;
		const textTrack = this.txtTrack;
		videoTrack.samples = this.remainderData || /* @__PURE__ */ new Uint8Array();
		this.remainderData = null;
		const id3Track = this.extractID3Track(videoTrack, this.timeOffset);
		const sampleData = this.parseFragment(videoTrack, textTrack, timeOffset, chunkMeta);
		return {
			videoTrack,
			audioTrack: dummyTrack(),
			id3Track,
			textTrack: dummyTrack(),
			initData: this.initData,
			sampleData
		};
	}
	parseFragment(videoTrack, textTrack, timeOffset, chunkMeta) {
		const initData = this.initData;
		if (initData && chunkMeta) {
			const { samples, sampleData } = parseSamplesAndTiming(timeOffset, videoTrack, initData, this.logger, false);
			textTrack.samples = samples;
			return sampleData;
		}
		textTrack.samples = parseSamples(timeOffset, videoTrack);
	}
	extractID3Track(videoTrack, timeOffset) {
		const id3Track = this.id3Track;
		if (videoTrack.samples.length) {
			const emsgs = findBox(videoTrack.samples, ["emsg"]);
			if (emsgs) emsgs.forEach((data) => {
				const emsgInfo = parseEmsg(data);
				if (emsgSchemePattern.test(emsgInfo.schemeIdUri)) {
					const pts = getEmsgStartTime(emsgInfo, timeOffset);
					let duration = emsgInfo.eventDuration === 4294967295 ? Number.POSITIVE_INFINITY : emsgInfo.eventDuration / emsgInfo.timeScale;
					if (duration <= .001) duration = Number.POSITIVE_INFINITY;
					const payload = emsgInfo.payload;
					id3Track.samples.push({
						data: payload,
						len: payload.byteLength,
						dts: pts,
						pts,
						type: MetadataSchema.emsg,
						duration
					});
				} else if (this.config.enableEmsgKLVMetadata) {
					const klvSchemaUri = this.config.emsgKLVSchemaUri || MetadataSchema.misbklv;
					if (emsgInfo.schemeIdUri.startsWith(klvSchemaUri)) {
						const pts = getEmsgStartTime(emsgInfo, timeOffset);
						id3Track.samples.push({
							data: emsgInfo.payload,
							len: emsgInfo.payload.byteLength,
							dts: pts,
							pts,
							type: MetadataSchema.misbklv,
							duration: Number.POSITIVE_INFINITY
						});
					}
				}
			});
		}
		return id3Track;
	}
	demuxSampleAes(data, keyData, timeOffset) {
		return Promise.reject(/* @__PURE__ */ new Error("The MP4 demuxer does not support SAMPLE-AES decryption"));
	}
	destroy() {
		this.config = null;
		this.remainderData = null;
		this.videoTrack = this.audioTrack = this.id3Track = this.txtTrack = void 0;
		this.initData = void 0;
	}
};
function getEmsgStartTime(emsgInfo, timeOffset) {
	return isFiniteNumber(emsgInfo.presentationTime) ? emsgInfo.presentationTime / emsgInfo.timeScale : timeOffset + emsgInfo.presentationTimeDelta / emsgInfo.timeScale;
}
var ANNEX_B_START_CODE_MARKER = 1;
var MIN_START_CODE_ZERO_RUN = 2;
var MAX_START_CODE_ZERO_RUN = 3;
var NAL_UNIT_TYPE_PENDING = -1;
var BaseVideoParser = class {
	constructor() {
		this.VideoSample = null;
	}
	createVideoSample(key, pts, dts) {
		return {
			key,
			frame: false,
			pts,
			dts,
			units: [],
			length: 0
		};
	}
	getLastNalUnit(samples) {
		var _VideoSample;
		let VideoSample = this.VideoSample;
		let lastUnit;
		if (!VideoSample || VideoSample.units.length === 0) VideoSample = samples[samples.length - 1];
		if ((_VideoSample = VideoSample) != null && _VideoSample.units) {
			const units = VideoSample.units;
			lastUnit = units[units.length - 1];
		}
		return lastUnit;
	}
	pushAccessUnit(VideoSample, videoTrack) {
		if (VideoSample.units.length && VideoSample.frame) {
			if (VideoSample.pts === void 0) {
				const samples = videoTrack.samples;
				const nbSamples = samples.length;
				if (nbSamples) {
					const lastSample = samples[nbSamples - 1];
					VideoSample.pts = lastSample.pts;
					VideoSample.dts = lastSample.dts;
				} else {
					videoTrack.dropped++;
					return;
				}
			}
			videoTrack.samples.push(VideoSample);
		}
	}
	parseNALu(track, array, _endOfSegment) {
		const len = array.byteLength;
		if (len === 0) return [];
		const previousState = track.naluState || 0;
		const previousZeroRun = previousState === NAL_UNIT_TYPE_PENDING ? 0 : previousState;
		const units = [];
		let nextState = 0;
		let searchFrom = 0;
		let unitStart = -1;
		let unitType = 0;
		if (previousState === NAL_UNIT_TYPE_PENDING) {
			unitStart = 0;
			unitType = this.getNALuType(array, 0);
			searchFrom = 1;
		}
		while (searchFrom < len) {
			const markerIndex = array.indexOf(ANNEX_B_START_CODE_MARKER, searchFrom);
			if (markerIndex === -1) break;
			searchFrom = markerIndex + 1;
			let nalEnd = markerIndex;
			while (nalEnd > 0 && array[nalEnd - 1] === 0) nalEnd--;
			const zeroRun = markerIndex - nalEnd + (nalEnd === 0 ? previousZeroRun : 0);
			if (zeroRun < MIN_START_CODE_ZERO_RUN) continue;
			const startCodeZeros = Math.min(zeroRun, MAX_START_CODE_ZERO_RUN);
			const chunkStartCodeZeros = Math.min(markerIndex - nalEnd, startCodeZeros);
			const previousUnitTrim = startCodeZeros - chunkStartCodeZeros;
			nalEnd = markerIndex - chunkStartCodeZeros;
			if (unitStart >= 0) units.push({
				data: array.subarray(unitStart, nalEnd),
				type: unitType
			});
			else {
				const previousUnit = this.getLastNalUnit(track.samples);
				if (previousUnit) {
					if (nalEnd > 0) previousUnit.data = appendUint8Array(previousUnit.data, array.subarray(0, nalEnd));
					else if (previousUnitTrim > 0) previousUnit.data = previousUnit.data.subarray(0, previousUnit.data.byteLength - previousUnitTrim);
					previousUnit.state = 0;
				}
			}
			if (searchFrom < len) {
				unitStart = searchFrom;
				unitType = this.getNALuType(array, searchFrom);
			} else {
				nextState = NAL_UNIT_TYPE_PENDING;
				unitStart = -1;
				break;
			}
		}
		if (nextState !== NAL_UNIT_TYPE_PENDING) {
			let trailingZeroStart = len;
			while (trailingZeroStart > 0 && array[trailingZeroStart - 1] === 0) trailingZeroStart--;
			nextState = len - trailingZeroStart + (trailingZeroStart === 0 ? previousZeroRun : 0);
		}
		if (unitStart >= 0) units.push({
			data: array.subarray(unitStart),
			type: unitType,
			state: nextState
		});
		else if (units.length === 0 && nextState !== NAL_UNIT_TYPE_PENDING) {
			const previousUnit = this.getLastNalUnit(track.samples);
			if (previousUnit) {
				previousUnit.data = appendUint8Array(previousUnit.data, array);
				previousUnit.state = nextState;
			}
		}
		track.naluState = nextState;
		return units;
	}
};
/**
* Parser for exponential Golomb codes, a variable-bitwidth number encoding scheme used by h264.
*/
var ExpGolomb = class {
	constructor(data) {
		this.data = void 0;
		this.bytesAvailable = void 0;
		this.word = void 0;
		this.bitsAvailable = void 0;
		this.data = data;
		this.bytesAvailable = data.byteLength;
		this.word = 0;
		this.bitsAvailable = 0;
	}
	loadWord() {
		const data = this.data;
		const bytesAvailable = this.bytesAvailable;
		const position = data.byteLength - bytesAvailable;
		const workingBytes = /* @__PURE__ */ new Uint8Array(4);
		const availableBytes = Math.min(4, bytesAvailable);
		if (availableBytes === 0) throw new Error("no bytes available");
		workingBytes.set(data.subarray(position, position + availableBytes));
		this.word = new DataView(workingBytes.buffer).getUint32(0);
		this.bitsAvailable = availableBytes * 8;
		this.bytesAvailable -= availableBytes;
	}
	skipBits(count) {
		let skipBytes;
		count = Math.min(count, this.bytesAvailable * 8 + this.bitsAvailable);
		if (this.bitsAvailable > count) {
			this.word <<= count;
			this.bitsAvailable -= count;
		} else {
			count -= this.bitsAvailable;
			skipBytes = count >> 3;
			count -= skipBytes << 3;
			this.bytesAvailable -= skipBytes;
			this.loadWord();
			this.word <<= count;
			this.bitsAvailable -= count;
		}
	}
	readBits(size) {
		let bits = Math.min(this.bitsAvailable, size);
		const valu = this.word >>> 32 - bits;
		if (size > 32) logger.error("Cannot read more than 32 bits at a time");
		this.bitsAvailable -= bits;
		if (this.bitsAvailable > 0) this.word <<= bits;
		else if (this.bytesAvailable > 0) this.loadWord();
		else throw new Error("no bits available");
		bits = size - bits;
		if (bits > 0 && this.bitsAvailable) return valu << bits | this.readBits(bits);
		else return valu;
	}
	skipLZ() {
		let leadingZeroCount = 0;
		for (; leadingZeroCount < this.bitsAvailable; ++leadingZeroCount) if ((this.word & 2147483648 >>> leadingZeroCount) !== 0) {
			this.word <<= leadingZeroCount;
			this.bitsAvailable -= leadingZeroCount;
			return leadingZeroCount;
		}
		this.loadWord();
		return leadingZeroCount + this.skipLZ();
	}
	skipUEG() {
		this.skipBits(1 + this.skipLZ());
	}
	skipEG() {
		this.skipBits(1 + this.skipLZ());
	}
	readUEG() {
		const clz = this.skipLZ();
		return this.readBits(clz + 1) - 1;
	}
	readEG() {
		const valu = this.readUEG();
		if (1 & valu) return 1 + valu >>> 1;
		else return -1 * (valu >>> 1);
	}
	readBoolean() {
		return this.readBits(1) === 1;
	}
	readUByte() {
		return this.readBits(8);
	}
};
var AvcVideoParser = class extends BaseVideoParser {
	parsePES(track, textTrack, pes, endOfSegment, chunkMeta) {
		const iframesOnly = chunkMeta.iframe;
		const units = this.parseNALu(track, pes.data, endOfSegment);
		let VideoSample = this.VideoSample;
		let push;
		let spsfound = false;
		pes.data = null;
		if (VideoSample && units.length && !track.audFound) {
			this.pushAccessUnit(VideoSample, track);
			VideoSample = this.VideoSample = this.createVideoSample(false, pes.pts, pes.dts);
		}
		units.forEach((unit) => {
			var _VideoSample2, _VideoSample3;
			switch (unit.type) {
				case 1: {
					if (iframesOnly) break;
					let iskey = false;
					push = true;
					const data = unit.data;
					if (spsfound && data.length > 4) {
						const sliceType = this.readSliceType(data);
						if (sliceType === 2 || sliceType === 4 || sliceType === 7 || sliceType === 9) iskey = true;
					}
					if (iskey) {
						var _VideoSample;
						if ((_VideoSample = VideoSample) != null && _VideoSample.frame && !VideoSample.key) {
							this.pushAccessUnit(VideoSample, track);
							VideoSample = this.VideoSample = null;
						}
					}
					if (!VideoSample) VideoSample = this.VideoSample = this.createVideoSample(true, pes.pts, pes.dts);
					VideoSample.frame = true;
					VideoSample.key = iskey;
					break;
				}
				case 5:
					push = true;
					if ((_VideoSample2 = VideoSample) != null && _VideoSample2.frame && !VideoSample.key) {
						this.pushAccessUnit(VideoSample, track);
						VideoSample = this.VideoSample = null;
					}
					if (!VideoSample) VideoSample = this.VideoSample = this.createVideoSample(true, pes.pts, pes.dts);
					VideoSample.key = true;
					VideoSample.frame = true;
					break;
				case 6:
					if (iframesOnly) break;
					push = true;
					parseSEIMessageFromNALu(unit.data, 1, pes.pts, textTrack.samples);
					break;
				case 7: {
					var _track$pixelRatio, _track$pixelRatio2;
					push = true;
					spsfound = true;
					const sps = unit.data;
					const config = this.readSPS(sps);
					if (!track.sps || track.width !== config.width || track.height !== config.height || ((_track$pixelRatio = track.pixelRatio) == null ? void 0 : _track$pixelRatio[0]) !== config.pixelRatio[0] || ((_track$pixelRatio2 = track.pixelRatio) == null ? void 0 : _track$pixelRatio2[1]) !== config.pixelRatio[1]) {
						track.width = config.width;
						track.height = config.height;
						track.pixelRatio = config.pixelRatio;
						track.sps = [sps];
						const codecarray = sps.subarray(1, 4);
						let codecstring = "avc1.";
						for (let i = 0; i < 3; i++) {
							let h = codecarray[i].toString(16);
							if (h.length < 2) h = "0" + h;
							codecstring += h;
						}
						track.codec = codecstring;
					}
					break;
				}
				case 8:
					push = true;
					track.pps = [unit.data];
					break;
				case 9:
					push = true;
					track.audFound = true;
					if ((_VideoSample3 = VideoSample) != null && _VideoSample3.frame) {
						this.pushAccessUnit(VideoSample, track);
						VideoSample = null;
					}
					if (!VideoSample) VideoSample = this.VideoSample = this.createVideoSample(false, pes.pts, pes.dts);
					break;
				case 12:
					push = true;
					break;
				default: push = false;
			}
			if (VideoSample && push) VideoSample.units.push(unit);
		});
		if (endOfSegment && VideoSample) {
			this.pushAccessUnit(VideoSample, track);
			this.VideoSample = null;
		}
	}
	getNALuType(data, offset) {
		return data[offset] & 31;
	}
	readSliceType(data) {
		const eg = new ExpGolomb(data);
		eg.readUByte();
		eg.readUEG();
		return eg.readUEG();
	}
	/**
	* The scaling list is optionally transmitted as part of a sequence parameter
	* set and is not relevant to transmuxing.
	* @param count the number of entries in this scaling list
	* @see Recommendation ITU-T H.264, Section 7.3.2.1.1.1
	*/
	skipScalingList(count, reader) {
		let lastScale = 8;
		let nextScale = 8;
		let deltaScale;
		for (let j = 0; j < count; j++) {
			if (nextScale !== 0) {
				deltaScale = reader.readEG();
				nextScale = (lastScale + deltaScale + 256) % 256;
			}
			lastScale = nextScale === 0 ? lastScale : nextScale;
		}
	}
	/**
	* Read a sequence parameter set and return some interesting video
	* properties. A sequence parameter set is the H264 metadata that
	* describes the properties of upcoming video frames.
	* @returns an object with configuration parsed from the
	* sequence parameter set, including the dimensions of the
	* associated video frames.
	*/
	readSPS(sps) {
		const eg = new ExpGolomb(sps);
		let frameCropLeftOffset = 0;
		let frameCropRightOffset = 0;
		let frameCropTopOffset = 0;
		let frameCropBottomOffset = 0;
		let numRefFramesInPicOrderCntCycle;
		let scalingListCount;
		let i;
		const readUByte = eg.readUByte.bind(eg);
		const readBits = eg.readBits.bind(eg);
		const readUEG = eg.readUEG.bind(eg);
		const readBoolean = eg.readBoolean.bind(eg);
		const skipBits = eg.skipBits.bind(eg);
		const skipEG = eg.skipEG.bind(eg);
		const skipUEG = eg.skipUEG.bind(eg);
		const skipScalingList = this.skipScalingList.bind(this);
		readUByte();
		const profileIdc = readUByte();
		readBits(5);
		skipBits(3);
		readUByte();
		skipUEG();
		if (profileIdc === 100 || profileIdc === 110 || profileIdc === 122 || profileIdc === 244 || profileIdc === 44 || profileIdc === 83 || profileIdc === 86 || profileIdc === 118 || profileIdc === 128) {
			const chromaFormatIdc = readUEG();
			if (chromaFormatIdc === 3) skipBits(1);
			skipUEG();
			skipUEG();
			skipBits(1);
			if (readBoolean()) {
				scalingListCount = chromaFormatIdc !== 3 ? 8 : 12;
				for (i = 0; i < scalingListCount; i++) if (readBoolean()) {
					if (i < 6) skipScalingList(16, eg);
					else skipScalingList(64, eg);
				}
			}
		}
		skipUEG();
		const picOrderCntType = readUEG();
		if (picOrderCntType === 0) readUEG();
		else if (picOrderCntType === 1) {
			skipBits(1);
			skipEG();
			skipEG();
			numRefFramesInPicOrderCntCycle = readUEG();
			for (i = 0; i < numRefFramesInPicOrderCntCycle; i++) skipEG();
		}
		skipUEG();
		skipBits(1);
		const picWidthInMbsMinus1 = readUEG();
		const picHeightInMapUnitsMinus1 = readUEG();
		const frameMbsOnlyFlag = readBits(1);
		if (frameMbsOnlyFlag === 0) skipBits(1);
		skipBits(1);
		if (readBoolean()) {
			frameCropLeftOffset = readUEG();
			frameCropRightOffset = readUEG();
			frameCropTopOffset = readUEG();
			frameCropBottomOffset = readUEG();
		}
		let pixelRatio = [1, 1];
		if (readBoolean()) {
			if (readBoolean()) switch (readUByte()) {
				case 1:
					pixelRatio = [1, 1];
					break;
				case 2:
					pixelRatio = [12, 11];
					break;
				case 3:
					pixelRatio = [10, 11];
					break;
				case 4:
					pixelRatio = [16, 11];
					break;
				case 5:
					pixelRatio = [40, 33];
					break;
				case 6:
					pixelRatio = [24, 11];
					break;
				case 7:
					pixelRatio = [20, 11];
					break;
				case 8:
					pixelRatio = [32, 11];
					break;
				case 9:
					pixelRatio = [80, 33];
					break;
				case 10:
					pixelRatio = [18, 11];
					break;
				case 11:
					pixelRatio = [15, 11];
					break;
				case 12:
					pixelRatio = [64, 33];
					break;
				case 13:
					pixelRatio = [160, 99];
					break;
				case 14:
					pixelRatio = [4, 3];
					break;
				case 15:
					pixelRatio = [3, 2];
					break;
				case 16:
					pixelRatio = [2, 1];
					break;
				case 255: pixelRatio = [readUByte() << 8 | readUByte(), readUByte() << 8 | readUByte()];
			}
		}
		return {
			width: Math.ceil((picWidthInMbsMinus1 + 1) * 16 - frameCropLeftOffset * 2 - frameCropRightOffset * 2),
			height: (2 - frameMbsOnlyFlag) * (picHeightInMapUnitsMinus1 + 1) * 16 - (frameMbsOnlyFlag ? 2 : 4) * (frameCropTopOffset + frameCropBottomOffset),
			pixelRatio
		};
	}
};
var PACKET_LENGTH = 188;
var TSDemuxer = class TSDemuxer {
	constructor(observer, config, typeSupported, logger) {
		this.logger = void 0;
		this.observer = void 0;
		this.config = void 0;
		this.typeSupported = void 0;
		this.sampleAes = null;
		this.pmtParsed = false;
		this.audioCodec = void 0;
		this.videoCodec = void 0;
		this._pmtId = -1;
		this._videoTrack = void 0;
		this._audioTrack = void 0;
		this._id3Track = void 0;
		this._txtTrack = void 0;
		this._klvPid = -1;
		this.aacOverFlow = null;
		this.remainderData = null;
		this.videoParser = void 0;
		this.videoIntegrityChecker = null;
		this.observer = observer;
		this.config = config;
		this.typeSupported = typeSupported;
		this.logger = logger;
		this.videoParser = null;
	}
	static probe(data, logger) {
		const syncOffset = TSDemuxer.syncOffset(data);
		if (syncOffset > 0) logger.warn(`MPEG2-TS detected but first sync word found @ offset ${syncOffset}`);
		return syncOffset !== -1;
	}
	static syncOffset(data) {
		const length = data.length;
		let scanwindow = Math.min(940, length - PACKET_LENGTH) + 1;
		let i = 0;
		while (i < scanwindow) {
			let foundPat = false;
			let packetStart = -1;
			let tsPackets = 0;
			for (let j = i; j < length; j += PACKET_LENGTH) if (data[j] === 71 && (length - j === PACKET_LENGTH || data[j + PACKET_LENGTH] === 71)) {
				tsPackets++;
				if (packetStart === -1) {
					packetStart = j;
					if (packetStart !== 0) scanwindow = Math.min(packetStart + 18612, data.length - PACKET_LENGTH) + 1;
				}
				if (!foundPat) foundPat = parsePID(data, j) === 0;
				if (foundPat && tsPackets > 1 && (packetStart === 0 && tsPackets > 2 || j + PACKET_LENGTH > scanwindow)) return packetStart;
			} else if (tsPackets) return -1;
			else break;
			i++;
		}
		return -1;
	}
	/**
	* Creates a track model internal to demuxer used to drive remuxing input
	*/
	static createTrack(type, duration) {
		return {
			container: type === "video" || type === "audio" ? "video/mp2t" : void 0,
			type,
			id: RemuxerTrackIdConfig[type],
			pid: -1,
			inputTimeScale: 9e4,
			sequenceNumber: 0,
			samples: [],
			dropped: 0,
			duration: type === "audio" ? duration : void 0
		};
	}
	/**
	* Initializes a new init segment on the demuxer/remuxer interface. Needed for discontinuities/track-switches (or at stream start)
	* Resets all internal track instances of the demuxer.
	*/
	resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration, decryptdata, chunkMeta) {
		this.pmtParsed = false;
		this._pmtId = -1;
		this._videoTrack = TSDemuxer.createTrack("video");
		this._videoTrack.duration = trackDuration;
		this.videoIntegrityChecker = this.config.handleMpegTsVideoIntegrityErrors === "skip" ? new PacketsIntegrityChecker(this.logger) : null;
		this._audioTrack = TSDemuxer.createTrack("audio", trackDuration);
		this._id3Track = TSDemuxer.createTrack("id3");
		this._txtTrack = TSDemuxer.createTrack("text");
		this._audioTrack.segmentCodec = "aac";
		this.videoParser = null;
		this.aacOverFlow = null;
		this.remainderData = null;
		this.audioCodec = audioCodec;
		this.videoCodec = videoCodec;
		if (initSegment) this.demux(initSegment, 0, chunkMeta, (decryptdata == null ? void 0 : decryptdata.method) === "SAMPLE-AES");
	}
	resetTimeStamp() {}
	resetContiguity() {
		const { _audioTrack, _videoTrack, _id3Track } = this;
		if (_audioTrack) _audioTrack.pesData = null;
		if (_videoTrack) _videoTrack.pesData = null;
		if (_id3Track) _id3Track.pesData = null;
		this.videoParser = null;
		this.aacOverFlow = null;
		this.remainderData = null;
	}
	demux(data, timeOffset, chunkMeta, isSampleAes = false, flush = false) {
		if (!isSampleAes) this.sampleAes = null;
		let pes;
		const videoTrack = this._videoTrack;
		const videoIntegrityChecker = this.videoIntegrityChecker;
		const audioTrack = this._audioTrack;
		const id3Track = this._id3Track;
		const textTrack = this._txtTrack;
		const iframe = chunkMeta.iframe;
		let videoPid = videoTrack.pid;
		let videoData = videoTrack.pesData;
		let audioPid = audioTrack.pid;
		let id3Pid = id3Track.pid;
		let klvPid = this._klvPid;
		let audioData = audioTrack.pesData;
		let id3Data = id3Track.pesData;
		let klvData = null;
		let unknownPID = null;
		let pmtParsed = this.pmtParsed;
		let pmtId = this._pmtId;
		let len = data.length;
		if (this.remainderData) {
			data = appendUint8Array(this.remainderData, data);
			len = data.length;
			this.remainderData = null;
		}
		if (len < PACKET_LENGTH && !flush) {
			this.remainderData = data;
			return {
				audioTrack,
				videoTrack,
				id3Track,
				textTrack
			};
		}
		const syncOffset = Math.max(0, TSDemuxer.syncOffset(data));
		len -= (len - syncOffset) % PACKET_LENGTH;
		if (len < data.byteLength && !flush) this.remainderData = new Uint8Array(data.buffer, len, data.buffer.byteLength - len);
		let tsPacketErrors = 0;
		for (let start = syncOffset; start < len; start += PACKET_LENGTH) if (data[start] === 71) {
			const stt = !!(data[start + 1] & 64);
			const pid = parsePID(data, start);
			const atf = (data[start + 3] & 48) >> 4;
			let offset;
			if (atf > 1) {
				offset = start + 5 + data[start + 4];
				if (offset === start + PACKET_LENGTH) continue;
			} else offset = start + 4;
			switch (pid) {
				case videoPid:
					if (stt) {
						if (videoData && !(videoIntegrityChecker != null && videoIntegrityChecker.isCorrupted) && (pes = parsePES(videoData, this.logger))) {
							this.readyVideoParser(videoTrack.segmentCodec);
							if (this.videoParser !== null) this.videoParser.parsePES(videoTrack, textTrack, pes, false, chunkMeta);
						}
						videoData = {
							data: [],
							size: 0
						};
						videoIntegrityChecker?.reset(videoPid);
					}
					videoIntegrityChecker?.handlePacket(data.subarray(start));
					if (videoData) {
						videoData.data.push(data.subarray(offset, start + PACKET_LENGTH));
						videoData.size += start + PACKET_LENGTH - offset;
					}
					break;
				case audioPid:
					if (iframe) break;
					if (stt) {
						if (audioData && (pes = parsePES(audioData, this.logger))) switch (audioTrack.segmentCodec) {
							case "aac":
								this.parseAACPES(audioTrack, pes, chunkMeta);
								break;
							case "mp3": this.parseMPEGPES(audioTrack, pes);
						}
						audioData = {
							data: [],
							size: 0
						};
					}
					if (audioData) {
						audioData.data.push(data.subarray(offset, start + PACKET_LENGTH));
						audioData.size += start + PACKET_LENGTH - offset;
					}
					break;
				case id3Pid:
					if (iframe) break;
					if (stt) {
						if (id3Data && (pes = parsePES(id3Data, this.logger))) this.parseID3PES(id3Track, pes);
						id3Data = {
							data: [],
							size: 0
						};
					}
					if (id3Data) {
						id3Data.data.push(data.subarray(offset, start + PACKET_LENGTH));
						id3Data.size += start + PACKET_LENGTH - offset;
					}
					break;
				case klvPid:
					if (iframe) break;
					if (stt) {
						if (klvData && (pes = parsePES(klvData, this.logger))) this.parseKlvPES(id3Track, pes);
						klvData = {
							data: [],
							size: 0
						};
					}
					if (klvData) {
						klvData.data.push(data.subarray(offset, start + PACKET_LENGTH));
						klvData.size += start + PACKET_LENGTH - offset;
					}
					break;
				case 0:
					if (stt) offset += data[offset] + 1;
					pmtId = this._pmtId = parsePAT(data, offset);
					break;
				case pmtId: {
					if (stt) offset += data[offset] + 1;
					const parsedPIDs = parsePMT(data, offset, this.typeSupported, isSampleAes, this.observer, this.logger, this.config, chunkMeta);
					videoPid = parsedPIDs.videoPid;
					if (videoPid > 0) {
						videoTrack.pid = videoPid;
						videoTrack.segmentCodec = parsedPIDs.segmentVideoCodec;
					}
					audioPid = parsedPIDs.audioPid;
					if (audioPid > 0) {
						audioTrack.pid = audioPid;
						audioTrack.segmentCodec = parsedPIDs.segmentAudioCodec;
					}
					id3Pid = parsedPIDs.id3Pid;
					if (id3Pid > 0) id3Track.pid = id3Pid;
					klvPid = parsedPIDs.klvPid;
					if (klvPid > 0) this._klvPid = klvPid;
					if (unknownPID !== null && !pmtParsed) {
						this.logger.warn(`MPEG-TS PMT found at ${start} after unknown PID '${unknownPID}'. Backtracking to sync byte @${syncOffset} to parse all TS packets.`);
						unknownPID = null;
						start = syncOffset - 188;
					}
					pmtParsed = this.pmtParsed = true;
					break;
				}
				case 17:
				case 8191: break;
				default: unknownPID = pid;
			}
		} else tsPacketErrors++;
		if (tsPacketErrors > 0) emitParsingError(this.observer, /* @__PURE__ */ new Error(`Found ${tsPacketErrors} TS packet/s that do not start with 0x47`), chunkMeta, void 0, this.logger);
		videoTrack.pesData = videoData;
		audioTrack.pesData = audioData;
		id3Track.pesData = id3Data;
		const demuxResult = {
			audioTrack,
			videoTrack,
			id3Track,
			textTrack
		};
		if (flush) this.extractRemainingSamples(demuxResult, chunkMeta);
		return demuxResult;
	}
	flush(timeOffset, chunkMeta) {
		const { remainderData } = this;
		this.remainderData = null;
		let result;
		if (remainderData) result = this.demux(remainderData, 0, chunkMeta, false, true);
		else result = {
			videoTrack: this._videoTrack,
			audioTrack: this._audioTrack,
			id3Track: this._id3Track,
			textTrack: this._txtTrack
		};
		this.extractRemainingSamples(result, chunkMeta);
		if (this.sampleAes) return this.decrypt(result, this.sampleAes);
		return result;
	}
	extractRemainingSamples(demuxResult, chunkMeta) {
		const { audioTrack, videoTrack, id3Track, textTrack } = demuxResult;
		const videoData = videoTrack.pesData;
		const audioData = audioTrack.pesData;
		const id3Data = id3Track.pesData;
		const videoIntegrityChecker = this.videoIntegrityChecker;
		let pes;
		if (videoData && !(videoIntegrityChecker != null && videoIntegrityChecker.isCorrupted) && (pes = parsePES(videoData, this.logger))) {
			this.readyVideoParser(videoTrack.segmentCodec);
			if (this.videoParser !== null) {
				this.videoParser.parsePES(videoTrack, textTrack, pes, true, chunkMeta);
				videoTrack.pesData = null;
			}
		} else videoTrack.pesData = videoData;
		if (audioData && (pes = parsePES(audioData, this.logger))) {
			switch (audioTrack.segmentCodec) {
				case "aac":
					this.parseAACPES(audioTrack, pes, chunkMeta);
					break;
				case "mp3": this.parseMPEGPES(audioTrack, pes);
			}
			audioTrack.pesData = null;
		} else {
			if (audioData != null && audioData.size) this.logger.log("last AAC PES packet truncated,might overlap between fragments");
			audioTrack.pesData = audioData;
		}
		if (id3Data && (pes = parsePES(id3Data, this.logger))) {
			this.parseID3PES(id3Track, pes);
			id3Track.pesData = null;
		} else id3Track.pesData = id3Data;
	}
	demuxSampleAes(data, keyData, timeOffset, chunkMeta) {
		const demuxResult = this.demux(data, timeOffset, chunkMeta, true, !this.config.progressive);
		const sampleAes = this.sampleAes = new SampleAesDecrypter(this.observer, this.config, keyData);
		return this.decrypt(demuxResult, sampleAes);
	}
	readyVideoParser(codec) {
		if (this.videoParser === null) {
			if (codec === "avc") this.videoParser = new AvcVideoParser();
		}
	}
	decrypt(demuxResult, sampleAes) {
		return new Promise((resolve) => {
			const { audioTrack, videoTrack } = demuxResult;
			if (audioTrack.samples && audioTrack.segmentCodec === "aac") sampleAes.decryptAacSamples(audioTrack.samples, 0, () => {
				if (videoTrack.samples) sampleAes.decryptAvcSamples(videoTrack.samples, 0, 0, () => {
					resolve(demuxResult);
				});
				else resolve(demuxResult);
			});
			else if (videoTrack.samples) sampleAes.decryptAvcSamples(videoTrack.samples, 0, 0, () => {
				resolve(demuxResult);
			});
		});
	}
	destroy() {
		if (this.observer) this.observer.removeAllListeners();
		this.config = this.logger = this.observer = null;
		this.aacOverFlow = this.videoParser = this.remainderData = this.sampleAes = null;
		this._videoTrack = this._audioTrack = this._id3Track = this._txtTrack = void 0;
		this.videoIntegrityChecker = null;
	}
	parseAACPES(track, pes, chunkMeta) {
		let startOffset = 0;
		const aacOverFlow = this.aacOverFlow;
		let data = pes.data;
		if (aacOverFlow) {
			this.aacOverFlow = null;
			const frameMissingBytes = aacOverFlow.missing;
			const sampleLength = aacOverFlow.sample.unit.byteLength;
			if (frameMissingBytes === -1) data = appendUint8Array(aacOverFlow.sample.unit, data);
			else {
				const frameOverflowBytes = sampleLength - frameMissingBytes;
				aacOverFlow.sample.unit.set(data.subarray(0, frameMissingBytes), frameOverflowBytes);
				track.samples.push(aacOverFlow.sample);
				startOffset = aacOverFlow.missing;
			}
		}
		let offset;
		let len;
		for (offset = startOffset, len = data.length; offset < len - 1; offset++) if (isHeader$1(data, offset)) break;
		if (offset !== startOffset) {
			let reason;
			const recoverable = offset < len - 1;
			if (recoverable) reason = `AAC PES did not start with ADTS header,offset:${offset}`;
			else reason = "No ADTS header found in AAC PES";
			emitParsingError(this.observer, new Error(reason), chunkMeta, recoverable, this.logger);
			if (!recoverable) return;
		}
		initTrackConfig(track, this.observer, data, offset, this.audioCodec);
		let pts;
		if (pes.pts !== void 0) pts = pes.pts;
		else if (aacOverFlow) {
			const frameDuration = getFrameDuration(track.samplerate);
			pts = aacOverFlow.sample.pts + frameDuration;
		} else {
			this.logger.warn("[tsdemuxer]: AAC PES unknown PTS");
			return;
		}
		let frameIndex = 0;
		let frame;
		while (offset < len) {
			frame = appendFrame$1(track, data, offset, pts, frameIndex);
			offset += frame.length;
			if (!frame.missing) {
				frameIndex++;
				for (; offset < len - 1; offset++) if (isHeader$1(data, offset)) break;
			} else {
				this.aacOverFlow = frame;
				break;
			}
		}
	}
	parseMPEGPES(track, pes) {
		const data = pes.data;
		const length = data.length;
		let frameIndex = 0;
		let offset = 0;
		const pts = pes.pts;
		if (pts === void 0) {
			this.logger.warn("[tsdemuxer]: MPEG PES unknown PTS");
			return;
		}
		while (offset < length) if (isHeader(data, offset)) {
			const frame = appendFrame(track, data, offset, pts, frameIndex);
			if (frame) {
				offset += frame.length;
				frameIndex++;
			} else break;
		} else offset++;
	}
	parseAC3PES(track, pes) {}
	parseID3PES(id3Track, pes) {
		if (pes.pts === void 0) {
			this.logger.warn("[tsdemuxer]: ID3 PES unknown PTS");
			return;
		}
		const id3Sample = _extends({}, pes, {
			type: this._videoTrack ? MetadataSchema.emsg : MetadataSchema.audioId3,
			duration: Number.POSITIVE_INFINITY
		});
		id3Track.samples.push(id3Sample);
	}
	parseKlvPES(id3Track, pes) {
		var _pes$pts;
		const pts = (_pes$pts = pes.pts) != null ? _pes$pts : pes.dts;
		if (pts === void 0) {
			this.logger.warn("[tsdemuxer]: KLV PES unknown PTS and DTS");
			return;
		}
		const klvData = pes.data;
		if (klvData.length < 16) {
			this.logger.warn("[tsdemuxer]: KLV PES payload too short");
			return;
		}
		let offset = 0;
		while (offset < klvData.length) {
			var _pes$dts;
			if (offset + 16 > klvData.length) break;
			const klvStart = offset;
			offset += 16;
			if (offset >= klvData.length) break;
			const firstByte = klvData[offset];
			offset += 1;
			let length = 0;
			if (firstByte & 128) {
				const lengthBytes = firstByte & 127;
				if (lengthBytes === 0 || lengthBytes > 4 || offset + lengthBytes > klvData.length) {
					this.logger.warn("[tsdemuxer]: Invalid KLV length encoding");
					break;
				}
				for (let i = 0; i < lengthBytes; i++) length = length << 8 | klvData[offset + i];
				offset += lengthBytes;
			} else length = firstByte;
			if (offset + length > klvData.length) {
				this.logger.warn("[tsdemuxer]: KLV value extends beyond PES payload");
				break;
			}
			const klvEnd = offset + length;
			const klvPacket = klvData.subarray(klvStart, klvEnd);
			const klvSample = {
				data: klvPacket,
				len: klvPacket.byteLength,
				pts,
				dts: (_pes$dts = pes.dts) != null ? _pes$dts : pts,
				type: MetadataSchema.misbklv,
				duration: Number.POSITIVE_INFINITY
			};
			id3Track.samples.push(klvSample);
			offset = klvEnd;
		}
	}
};
function parsePID(data, offset) {
	return ((data[offset + 1] & 31) << 8) + data[offset + 2];
}
function parsePAT(data, offset) {
	return (data[offset + 10] & 31) << 8 | data[offset + 11];
}
function parsePMT(data, offset, typeSupported, isSampleAes, observer, logger, config, chunkMeta) {
	const result = {
		audioPid: -1,
		videoPid: -1,
		id3Pid: -1,
		klvPid: -1,
		segmentVideoCodec: "avc",
		segmentAudioCodec: "aac"
	};
	const sectionLength = (data[offset + 1] & 15) << 8 | data[offset + 2];
	const tableEnd = offset + 3 + sectionLength - 4;
	const programInfoLength = (data[offset + 10] & 15) << 8 | data[offset + 11];
	offset += 12 + programInfoLength;
	while (offset < tableEnd) {
		const pid = parsePID(data, offset);
		const esInfoLength = (data[offset + 3] & 15) << 8 | data[offset + 4];
		switch (data[offset]) {
			case 207: if (!isSampleAes) {
				logEncryptedSamplesFoundInUnencryptedStream("ADTS AAC", logger);
				break;
			}
			case 15:
				if (result.audioPid === -1) result.audioPid = pid;
				break;
			case 21:
				if (result.id3Pid === -1) result.id3Pid = pid;
				break;
			case 219: if (!isSampleAes) {
				logEncryptedSamplesFoundInUnencryptedStream("H.264", logger);
				break;
			}
			case 27:
				if (result.videoPid === -1) result.videoPid = pid;
				break;
			case 3:
			case 4:
				if (!typeSupported.mpeg && !typeSupported.mp3) logger.log("MPEG audio found, not supported in this browser");
				else if (result.audioPid === -1) {
					result.audioPid = pid;
					result.segmentAudioCodec = "mp3";
				}
				break;
			case 193: if (!isSampleAes) {
				logEncryptedSamplesFoundInUnencryptedStream("AC-3", logger);
				break;
			}
			case 129:
				logger.warn("AC-3 in M2TS support not included in build");
				break;
			case 6:
				if (esInfoLength > 0) {
					let parsePos = offset + 5;
					let remaining = esInfoLength;
					while (remaining > 2) {
						switch (data[parsePos]) {
							case 106:
								if (result.audioPid === -1) logger.warn("AC-3 in M2TS support not included in build");
								break;
							case 5: if (result.klvPid === -1 && config.enableEmsgKLVMetadata) {
								result.klvPid = pid;
								logger.log(`KLV metadata PID found: ${pid}`);
							}
						}
						const descriptorLen = data[parsePos + 1] + 2;
						parsePos += descriptorLen;
						remaining -= descriptorLen;
					}
				}
				break;
			case 194:
			case 135:
				emitParsingError(observer, /* @__PURE__ */ new Error("Unsupported EC-3 in M2TS found"), chunkMeta, void 0, logger);
				return result;
			case 36:
				emitParsingError(observer, /* @__PURE__ */ new Error("Unsupported HEVC in M2TS found"), chunkMeta, void 0, logger);
				return result;
		}
		offset += esInfoLength + 5;
	}
	return result;
}
function emitParsingError(observer, error, chunkMeta, levelRetry, logger) {
	logger.warn(`parsing error: ${error.message}`);
	observer.emit(Events.ERROR, Events.ERROR, {
		type: ErrorTypes.MEDIA_ERROR,
		details: ErrorDetails.FRAG_PARSING_ERROR,
		fatal: false,
		levelRetry,
		chunkMeta,
		error,
		reason: error.message
	});
}
function logEncryptedSamplesFoundInUnencryptedStream(type, logger) {
	logger.log(`${type} with AES-128-CBC encryption found in unencrypted stream`);
}
function parsePES(stream, logger) {
	let i = 0;
	let frag;
	let pesLen;
	let pesHdrLen;
	let pesPts;
	let pesDts;
	const data = stream.data;
	if (!stream || stream.size === 0) return null;
	while (data[0].length < 19 && data.length > 1) {
		data[0] = appendUint8Array(data[0], data[1]);
		data.splice(1, 1);
	}
	frag = data[0];
	if ((frag[0] << 16) + (frag[1] << 8) + frag[2] === 1) {
		pesLen = (frag[4] << 8) + frag[5];
		if (pesLen && pesLen > stream.size - 6) return null;
		const pesFlags = frag[7];
		if (pesFlags & 192) {
			pesPts = (frag[9] & 14) * 536870912 + (frag[10] & 255) * 4194304 + (frag[11] & 254) * 16384 + (frag[12] & 255) * 128 + (frag[13] & 254) / 2;
			if (pesFlags & 64) {
				pesDts = (frag[14] & 14) * 536870912 + (frag[15] & 255) * 4194304 + (frag[16] & 254) * 16384 + (frag[17] & 255) * 128 + (frag[18] & 254) / 2;
				if (pesPts - pesDts > 54e5) {
					logger.warn(`${Math.round((pesPts - pesDts) / 9e4)}s delta between PTS and DTS, align them`);
					pesPts = pesDts;
				}
			} else pesDts = pesPts;
		}
		pesHdrLen = frag[8];
		let payloadStartOffset = pesHdrLen + 9;
		if (stream.size <= payloadStartOffset) return null;
		stream.size -= payloadStartOffset;
		const pesData = new Uint8Array(stream.size);
		for (let j = 0, dataLen = data.length; j < dataLen; j++) {
			frag = data[j];
			let len = frag.byteLength;
			if (payloadStartOffset) {
				if (payloadStartOffset > len) {
					payloadStartOffset -= len;
					continue;
				} else {
					frag = frag.subarray(payloadStartOffset);
					len -= payloadStartOffset;
					payloadStartOffset = 0;
				}
			}
			pesData.set(frag, i);
			i += len;
		}
		if (pesLen) pesLen -= pesHdrLen + 3;
		return {
			data: pesData,
			pts: pesPts,
			dts: pesDts,
			len: pesLen
		};
	}
	return null;
}
var PacketsIntegrityChecker = class {
	constructor(logger) {
		this.logger = void 0;
		this.pid = 0;
		this.lastContinuityCounter = -1;
		this.integrityState = "ok";
		this.logger = logger;
	}
	get isCorrupted() {
		return this.integrityState !== "ok";
	}
	reset(pid) {
		this.pid = pid;
		this.lastContinuityCounter = -1;
		this.integrityState = "ok";
	}
	handlePacket(data) {
		if (data.byteLength < 4) return;
		const pid = parsePID(data, 0);
		if (pid !== this.pid) {
			this.logger.debug(`Packet PID mismatch, expected ${this.pid} got ${pid}`);
			return;
		}
		const adaptationFieldControl = (data[3] & 48) >> 4;
		if (adaptationFieldControl === 0) return;
		const continuityCounter = data[3] & 15;
		const lastContinuityCounter = this.lastContinuityCounter;
		this.lastContinuityCounter = continuityCounter;
		const hasPayload = (adaptationFieldControl & 1) != 0;
		if ((adaptationFieldControl & 2) != 0 && data[4] != 0 && (data[5] & 128) != 0) return;
		if (lastContinuityCounter < 0) return;
		const expectedContinuityCounter = hasPayload ? lastContinuityCounter + 1 & 15 : lastContinuityCounter;
		if (continuityCounter !== expectedContinuityCounter) {
			this.logger.warn(`MPEG-TS Continuity Counter check failed for PID='${pid}', CC=${continuityCounter}, Expected-CC=${expectedContinuityCounter} Last-CC=${lastContinuityCounter}`);
			this.integrityState = "cc-failed";
			return;
		}
		if ((data[1] & 128) !== 0) {
			this.logger.warn(`MPEG-TS Packet had TEI flag set for PID='${pid}'`);
			this.integrityState = "tei-bit";
			return;
		}
	}
};
/**
*  AAC helper
*/
var AAC = class {
	static getSilentFrame(codec, channelCount) {
		switch (codec) {
			case "mp4a.40.2":
				if (channelCount === 1) return new Uint8Array([
					0,
					200,
					0,
					128,
					35,
					128
				]);
				else if (channelCount === 2) return new Uint8Array([
					33,
					0,
					73,
					144,
					2,
					25,
					0,
					35,
					128
				]);
				else if (channelCount === 3) return new Uint8Array([
					0,
					200,
					0,
					128,
					32,
					132,
					1,
					38,
					64,
					8,
					100,
					0,
					142
				]);
				else if (channelCount === 4) return new Uint8Array([
					0,
					200,
					0,
					128,
					32,
					132,
					1,
					38,
					64,
					8,
					100,
					0,
					128,
					44,
					128,
					8,
					2,
					56
				]);
				else if (channelCount === 5) return new Uint8Array([
					0,
					200,
					0,
					128,
					32,
					132,
					1,
					38,
					64,
					8,
					100,
					0,
					130,
					48,
					4,
					153,
					0,
					33,
					144,
					2,
					56
				]);
				else if (channelCount === 6) return new Uint8Array([
					0,
					200,
					0,
					128,
					32,
					132,
					1,
					38,
					64,
					8,
					100,
					0,
					130,
					48,
					4,
					153,
					0,
					33,
					144,
					2,
					0,
					178,
					0,
					32,
					8,
					224
				]);
				break;
			default: if (channelCount === 1) return new Uint8Array([
				1,
				64,
				34,
				128,
				163,
				78,
				230,
				128,
				186,
				8,
				0,
				0,
				0,
				28,
				6,
				241,
				193,
				10,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				94
			]);
			else if (channelCount === 2) return new Uint8Array([
				1,
				64,
				34,
				128,
				163,
				94,
				230,
				128,
				186,
				8,
				0,
				0,
				0,
				0,
				149,
				0,
				6,
				241,
				161,
				10,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				94
			]);
			else if (channelCount === 3) return new Uint8Array([
				1,
				64,
				34,
				128,
				163,
				94,
				230,
				128,
				186,
				8,
				0,
				0,
				0,
				0,
				149,
				0,
				6,
				241,
				161,
				10,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				90,
				94
			]);
		}
	}
};
var _MP;
var HDLR_TYPES = {
	video: new Uint8Array([
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		118,
		105,
		100,
		101,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		86,
		105,
		100,
		101,
		111,
		72,
		97,
		110,
		100,
		108,
		101,
		114,
		0
	]),
	audio: new Uint8Array([
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		115,
		111,
		117,
		110,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		83,
		111,
		117,
		110,
		100,
		72,
		97,
		110,
		100,
		108,
		101,
		114,
		0
	])
};
var STCO = new Uint8Array([
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0
]);
var STSZ = new Uint8Array([
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0
]);
var VMHD = new Uint8Array([
	0,
	0,
	0,
	1,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0
]);
var SMHD = new Uint8Array([
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0
]);
var STSD = new Uint8Array([
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	1
]);
var majorBrand = new Uint8Array([
	105,
	115,
	111,
	109
]);
var avc1Brand = new Uint8Array([
	97,
	118,
	99,
	49
]);
var minorVersion = new Uint8Array([
	0,
	0,
	0,
	1
]);
var MP4 = class MP4 {
	static box(type, ...payload) {
		let size = 8;
		let i = payload.length;
		const len = i;
		while (i--) size += payload[i].byteLength;
		const result = new Uint8Array(size);
		writeUint32(result, 0, size);
		writeUint32(result, 4, type);
		for (i = 0, size = 8; i < len; i++) {
			result.set(payload[i], size);
			size += payload[i].byteLength;
		}
		return result;
	}
	static hdlr(type) {
		return MP4.box(types.hdlr, HDLR_TYPES[type]);
	}
	static mdat(data) {
		return MP4.box(types.mdat, data);
	}
	static mdhd(timescale, duration) {
		duration *= timescale;
		const upperWordDuration = Math.floor(duration / (UINT32_MAX + 1));
		const lowerWordDuration = Math.floor(duration % (UINT32_MAX + 1));
		return MP4.box(types.mdhd, new Uint8Array([
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			2,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			3,
			timescale >> 24 & 255,
			timescale >> 16 & 255,
			timescale >> 8 & 255,
			timescale & 255,
			upperWordDuration >> 24,
			upperWordDuration >> 16 & 255,
			upperWordDuration >> 8 & 255,
			upperWordDuration & 255,
			lowerWordDuration >> 24,
			lowerWordDuration >> 16 & 255,
			lowerWordDuration >> 8 & 255,
			lowerWordDuration & 255,
			85,
			196,
			0,
			0
		]));
	}
	static mdia(track) {
		return MP4.box(types.mdia, MP4.mdhd(track.timescale || 0, track.duration || 0), MP4.hdlr(track.type), MP4.minf(track));
	}
	static mfhd(sequenceNumber) {
		return MP4.box(types.mfhd, new Uint8Array([
			0,
			0,
			0,
			0,
			sequenceNumber >> 24,
			sequenceNumber >> 16 & 255,
			sequenceNumber >> 8 & 255,
			sequenceNumber & 255
		]));
	}
	static minf(track) {
		if (track.type === "audio") return MP4.box(types.minf, MP4.box(types.smhd, SMHD), MP4.DINF, MP4.stbl(track));
		else return MP4.box(types.minf, MP4.box(types.vmhd, VMHD), MP4.DINF, MP4.stbl(track));
	}
	static moof(sn, baseMediaDecodeTime, track) {
		return MP4.box(types.moof, MP4.mfhd(sn), MP4.traf(track, baseMediaDecodeTime));
	}
	static moov(tracks) {
		let i = tracks.length;
		const boxes = [];
		while (i--) boxes[i] = MP4.trak(tracks[i]);
		return MP4.box.apply(null, [types.moov, MP4.mvhd(tracks[0].timescale || 0, tracks[0].duration || 0)].concat(boxes).concat(MP4.mvex(tracks)));
	}
	static mvex(tracks) {
		let i = tracks.length;
		const boxes = [];
		while (i--) boxes[i] = MP4.trex(tracks[i]);
		return MP4.box.apply(null, [types.mvex, ...boxes]);
	}
	static mvhd(timescale, duration) {
		duration *= timescale;
		const upperWordDuration = Math.floor(duration / (UINT32_MAX + 1));
		const lowerWordDuration = Math.floor(duration % (UINT32_MAX + 1));
		const bytes = new Uint8Array([
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			2,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			3,
			timescale >> 24 & 255,
			timescale >> 16 & 255,
			timescale >> 8 & 255,
			timescale & 255,
			upperWordDuration >> 24,
			upperWordDuration >> 16 & 255,
			upperWordDuration >> 8 & 255,
			upperWordDuration & 255,
			lowerWordDuration >> 24,
			lowerWordDuration >> 16 & 255,
			lowerWordDuration >> 8 & 255,
			lowerWordDuration & 255,
			0,
			1,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			64,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			255,
			255,
			255,
			255
		]);
		return MP4.box(types.mvhd, bytes);
	}
	static sdtp(track) {
		const samples = track.samples || [];
		const bytes = new Uint8Array(4 + samples.length);
		let i;
		let flags;
		for (i = 0; i < samples.length; i++) {
			flags = samples[i].flags;
			bytes[i + 4] = flags.dependsOn << 4 | flags.isDependedOn << 2 | flags.hasRedundancy;
		}
		return MP4.box(types.sdtp, bytes);
	}
	static stbl(track) {
		return MP4.box(types.stbl, MP4.stsd(track), MP4.box(types.stts, STCO), MP4.box(types.stsc, STCO), MP4.box(types.stsz, STSZ), MP4.box(types.stco, STCO));
	}
	static avc1(track) {
		let sps = [];
		let pps = [];
		let i;
		let data;
		let len;
		for (i = 0; i < track.sps.length; i++) {
			data = track.sps[i];
			len = data.byteLength;
			sps.push(len >>> 8 & 255);
			sps.push(len & 255);
			sps = sps.concat(Array.prototype.slice.call(data));
		}
		for (i = 0; i < track.pps.length; i++) {
			data = track.pps[i];
			len = data.byteLength;
			pps.push(len >>> 8 & 255);
			pps.push(len & 255);
			pps = pps.concat(Array.prototype.slice.call(data));
		}
		const avcc = MP4.box(types.avcC, new Uint8Array([
			1,
			sps[3],
			sps[4],
			sps[5],
			255,
			224 | track.sps.length
		].concat(sps).concat([track.pps.length]).concat(pps)));
		const width = track.width;
		const height = track.height;
		const hSpacing = track.pixelRatio[0];
		const vSpacing = track.pixelRatio[1];
		return MP4.box(types.avc1, new Uint8Array([
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			width >> 8 & 255,
			width & 255,
			height >> 8 & 255,
			height & 255,
			0,
			72,
			0,
			0,
			0,
			72,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			1,
			18,
			100,
			97,
			105,
			108,
			121,
			109,
			111,
			116,
			105,
			111,
			110,
			47,
			104,
			108,
			115,
			46,
			106,
			115,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			24,
			17,
			17
		]), avcc, MP4.box(types.btrt, new Uint8Array([
			0,
			28,
			156,
			128,
			0,
			45,
			198,
			192,
			0,
			45,
			198,
			192
		])), MP4.box(types.pasp, new Uint8Array([
			hSpacing >> 24,
			hSpacing >> 16 & 255,
			hSpacing >> 8 & 255,
			hSpacing & 255,
			vSpacing >> 24,
			vSpacing >> 16 & 255,
			vSpacing >> 8 & 255,
			vSpacing & 255
		])));
	}
	static esds(track) {
		const config = track.config;
		const len = config.length;
		return new Uint8Array([
			0,
			0,
			0,
			0,
			3,
			23 + len,
			0,
			1,
			0,
			4,
			15 + len,
			64,
			21,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			5,
			len,
			...config,
			6,
			1,
			2
		]);
	}
	static audioStsd(track) {
		const samplerate = track.samplerate || 0;
		return new Uint8Array([
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			track.channelCount || 0,
			0,
			16,
			0,
			0,
			0,
			0,
			samplerate >> 8 & 255,
			samplerate & 255,
			0,
			0
		]);
	}
	static mp4a(track) {
		return MP4.box(types.mp4a, MP4.audioStsd(track), MP4.box(types.esds, MP4.esds(track)));
	}
	static mp3(track) {
		return MP4.box(types[".mp3"], MP4.audioStsd(track));
	}
	static ac3(track) {
		return MP4.box(types["ac-3"], MP4.audioStsd(track), MP4.box(types.dac3, track.config));
	}
	static stsd(track) {
		const { segmentCodec } = track;
		if (track.type === "audio") {
			if (segmentCodec === "aac") return MP4.box(types.stsd, STSD, MP4.mp4a(track));
			if (segmentCodec === "mp3" && track.codec === "mp3") return MP4.box(types.stsd, STSD, MP4.mp3(track));
		} else if (track.pps && track.sps) {
			if (segmentCodec === "avc") return MP4.box(types.stsd, STSD, MP4.avc1(track));
		} else throw new Error(`video track missing pps or sps`);
		throw new Error(`unsupported ${track.type} segment codec (${segmentCodec}/${track.codec})`);
	}
	static tkhd(track) {
		const id = track.id;
		const duration = (track.duration || 0) * (track.timescale || 0);
		const width = track.width || 0;
		const height = track.height || 0;
		const upperWordDuration = Math.floor(duration / (UINT32_MAX + 1));
		const lowerWordDuration = Math.floor(duration % (UINT32_MAX + 1));
		return MP4.box(types.tkhd, new Uint8Array([
			1,
			0,
			0,
			7,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			2,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			3,
			id >> 24 & 255,
			id >> 16 & 255,
			id >> 8 & 255,
			id & 255,
			0,
			0,
			0,
			0,
			upperWordDuration >> 24,
			upperWordDuration >> 16 & 255,
			upperWordDuration >> 8 & 255,
			upperWordDuration & 255,
			lowerWordDuration >> 24,
			lowerWordDuration >> 16 & 255,
			lowerWordDuration >> 8 & 255,
			lowerWordDuration & 255,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			64,
			0,
			0,
			0,
			width >> 8 & 255,
			width & 255,
			0,
			0,
			height >> 8 & 255,
			height & 255,
			0,
			0
		]));
	}
	static traf(track, baseMediaDecodeTime) {
		const sampleDependencyTable = MP4.sdtp(track);
		const id = track.id;
		const upperWordBaseMediaDecodeTime = Math.floor(baseMediaDecodeTime / (UINT32_MAX + 1));
		const lowerWordBaseMediaDecodeTime = Math.floor(baseMediaDecodeTime % (UINT32_MAX + 1));
		return MP4.box(types.traf, MP4.box(types.tfhd, new Uint8Array([
			0,
			0,
			0,
			0,
			id >> 24,
			id >> 16 & 255,
			id >> 8 & 255,
			id & 255
		])), MP4.box(types.tfdt, new Uint8Array([
			1,
			0,
			0,
			0,
			upperWordBaseMediaDecodeTime >> 24,
			upperWordBaseMediaDecodeTime >> 16 & 255,
			upperWordBaseMediaDecodeTime >> 8 & 255,
			upperWordBaseMediaDecodeTime & 255,
			lowerWordBaseMediaDecodeTime >> 24,
			lowerWordBaseMediaDecodeTime >> 16 & 255,
			lowerWordBaseMediaDecodeTime >> 8 & 255,
			lowerWordBaseMediaDecodeTime & 255
		])), MP4.trun(track, sampleDependencyTable.length + 16 + 20 + 8 + 16 + 8 + 8), sampleDependencyTable);
	}
	/**
	* Generate a track box.
	* @param track a track definition
	*/
	static trak(track) {
		track.duration = track.duration || 4294967295;
		return MP4.box(types.trak, MP4.tkhd(track), MP4.mdia(track));
	}
	static trex(track) {
		const id = track.id;
		return MP4.box(types.trex, new Uint8Array([
			0,
			0,
			0,
			0,
			id >> 24,
			id >> 16 & 255,
			id >> 8 & 255,
			id & 255,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			1,
			0,
			1
		]));
	}
	static trun(track, offset) {
		const samples = track.samples || [];
		const len = samples.length;
		const arraylen = 12 + 16 * len;
		const array = new Uint8Array(arraylen);
		let i;
		let sample;
		let duration;
		let size;
		let flags;
		let cts;
		offset += 8 + arraylen;
		array.set([
			track.type === "video" ? 1 : 0,
			0,
			15,
			1,
			len >>> 24 & 255,
			len >>> 16 & 255,
			len >>> 8 & 255,
			len & 255,
			offset >>> 24 & 255,
			offset >>> 16 & 255,
			offset >>> 8 & 255,
			offset & 255
		], 0);
		for (i = 0; i < len; i++) {
			sample = samples[i];
			duration = sample.duration;
			size = sample.size;
			flags = sample.flags;
			cts = sample.cts;
			array.set([
				duration >>> 24 & 255,
				duration >>> 16 & 255,
				duration >>> 8 & 255,
				duration & 255,
				size >>> 24 & 255,
				size >>> 16 & 255,
				size >>> 8 & 255,
				size & 255,
				flags.isLeading << 2 | flags.dependsOn,
				flags.isDependedOn << 6 | flags.hasRedundancy << 4 | flags.paddingValue << 1 | flags.isNonSync,
				flags.degradPrio & 61440,
				flags.degradPrio & 15,
				cts >>> 24 & 255,
				cts >>> 16 & 255,
				cts >>> 8 & 255,
				cts & 255
			], 12 + 16 * i);
		}
		return MP4.box(types.trun, array);
	}
	static initSegment(tracks) {
		const movie = MP4.moov(tracks);
		return appendUint8Array(MP4.FTYP, movie);
	}
	static hvc1(track) {
		return /* @__PURE__ */ new Uint8Array();
	}
};
_MP = MP4;
MP4.FTYP = _MP.box(types.ftyp, majorBrand, minorVersion, majorBrand, avc1Brand);
MP4.DINF = _MP.box(types.dinf, _MP.box(types.dref, new Uint8Array([
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	1,
	0,
	0,
	0,
	12,
	117,
	114,
	108,
	32,
	0,
	0,
	0,
	1
])));
var MPEG_TS_CLOCK_FREQ_HZ = 9e4;
function toTimescaleFromBase(baseTime, destScale, srcBase = 1, round = false) {
	const result = baseTime * destScale * srcBase;
	return round ? Math.round(result) : result;
}
function toMsFromMpegTsClock(baseTime, round = false) {
	return toTimescaleFromBase(baseTime, 1e3, 1 / MPEG_TS_CLOCK_FREQ_HZ, round);
}
function timestampToString(timestamp) {
	const { baseTime, timescale, trackId } = timestamp;
	return `${baseTime / timescale} (${baseTime}/${timescale}) trackId: ${trackId}`;
}
var MAX_SILENT_FRAME_DURATION = 1e4;
var AAC_SAMPLES_PER_FRAME = 1024;
var MPEG_AUDIO_SAMPLE_PER_FRAME = 1152;
var AC3_SAMPLES_PER_FRAME = 1536;
var MPEG_TS_PTS_ROLLOVER = 8589934592;
function createMp4Sample(isKeyframe, duration, size, cts) {
	return {
		duration,
		size,
		cts,
		flags: {
			isLeading: 0,
			isDependedOn: 0,
			hasRedundancy: 0,
			degradPrio: 0,
			dependsOn: isKeyframe ? 2 : 1,
			isNonSync: isKeyframe ? 0 : 1,
			paddingValue: 0
		}
	};
}
var MP4Remuxer = class extends Logger {
	constructor(observer, config, typeSupported, logger) {
		super("mp4-remuxer", logger);
		this.observer = void 0;
		this.config = void 0;
		this.typeSupported = void 0;
		this.ISGenerated = false;
		this._initPTS = null;
		this._initDTS = null;
		this.nextVideoTs = null;
		this.nextAudioTs = null;
		this.videoSampleDuration = null;
		this.isAudioContiguous = false;
		this.isVideoContiguous = false;
		this.videoTrackConfig = void 0;
		this.observer = observer;
		this.config = config;
		this.typeSupported = typeSupported;
		this.ISGenerated = false;
	}
	destroy() {
		this.config = this.videoTrackConfig = this._initPTS = this._initDTS = null;
	}
	resetTimeStamp(defaultTimeStamp) {
		const initPTS = this._initPTS;
		if (!initPTS || !defaultTimeStamp || defaultTimeStamp.trackId !== initPTS.trackId || defaultTimeStamp.baseTime !== initPTS.baseTime || defaultTimeStamp.timescale !== initPTS.timescale) this.log(`Reset initPTS: ${initPTS ? timestampToString(initPTS) : initPTS} > ${defaultTimeStamp ? timestampToString(defaultTimeStamp) : defaultTimeStamp}`);
		this._initPTS = this._initDTS = defaultTimeStamp;
	}
	resetNextTimestamp() {
		this.log("reset next timestamp");
		this.isVideoContiguous = false;
		this.isAudioContiguous = false;
	}
	resetInitSegment() {
		this.log("ISGenerated flag reset");
		this.ISGenerated = false;
		this.videoTrackConfig = void 0;
	}
	getVideoStartPts(videoSamples) {
		let rolloverDetected = false;
		const firstPts = videoSamples[0].pts;
		const startPTS = videoSamples.reduce((minPTS, sample) => {
			let pts = sample.pts;
			let delta = pts - minPTS;
			if (delta < -4294967296) {
				rolloverDetected = true;
				pts = normalizePts(pts, firstPts);
				delta = pts - minPTS;
			}
			if (delta > 0) return minPTS;
			return pts;
		}, firstPts);
		if (rolloverDetected) this.debug("PTS rollover detected");
		return startPTS;
	}
	remux(audioTrack, videoTrack, id3Track, textTrack, timeOffset, accurateTimeOffset, flush, playlistType, chunkMeta) {
		let video;
		let audio;
		let initSegment;
		let text;
		let id3;
		let independent;
		let audioTimeOffset = timeOffset;
		let videoTimeOffset = timeOffset;
		const hasAudio = !chunkMeta.iframe && audioTrack.pid > -1;
		const hasVideo = videoTrack.pid > -1;
		const length = videoTrack.samples.length;
		const enoughAudioSamples = audioTrack.samples.length > 0;
		const enoughVideoSamples = flush && length > 0 || length > 1;
		if ((!hasAudio || enoughAudioSamples) && (!hasVideo || enoughVideoSamples) || this.ISGenerated || flush) {
			if (this.ISGenerated) {
				var _videoTrack$pixelRati, _config$pixelRatio, _videoTrack$pixelRati2, _config$pixelRatio2;
				const config = this.videoTrackConfig;
				if (config && (videoTrack.width !== config.width || videoTrack.height !== config.height || ((_videoTrack$pixelRati = videoTrack.pixelRatio) == null ? void 0 : _videoTrack$pixelRati[0]) !== ((_config$pixelRatio = config.pixelRatio) == null ? void 0 : _config$pixelRatio[0]) || ((_videoTrack$pixelRati2 = videoTrack.pixelRatio) == null ? void 0 : _videoTrack$pixelRati2[1]) !== ((_config$pixelRatio2 = config.pixelRatio) == null ? void 0 : _config$pixelRatio2[1])) || !config && enoughVideoSamples || this.nextAudioTs === null && enoughAudioSamples) this.resetInitSegment();
			}
			if (!this.ISGenerated) initSegment = this.generateIS(audioTrack, videoTrack, timeOffset, accurateTimeOffset);
			const isVideoContiguous = this.isVideoContiguous;
			let firstKeyFrameIndex = -1;
			let firstKeyFramePTS;
			if (enoughVideoSamples) {
				firstKeyFrameIndex = findKeyframeIndex(videoTrack.samples);
				if (!isVideoContiguous && this.config.forceKeyFrameOnDiscontinuity) {
					independent = true;
					if (firstKeyFrameIndex > 0) {
						this.warn(`Dropped ${firstKeyFrameIndex} out of ${length} video samples due to a missing keyframe`);
						const startPTS = this.getVideoStartPts(videoTrack.samples);
						videoTrack.samples = videoTrack.samples.slice(firstKeyFrameIndex);
						videoTrack.dropped += firstKeyFrameIndex;
						videoTimeOffset += (videoTrack.samples[0].pts - startPTS) / videoTrack.inputTimeScale;
						firstKeyFramePTS = videoTimeOffset;
					} else if (firstKeyFrameIndex === -1) {
						this.warn(`No keyframe found out of ${length} video samples`);
						independent = false;
					}
				}
			}
			if (this.ISGenerated) {
				if (enoughAudioSamples && enoughVideoSamples && timeOffset) {
					const startPTS = this.getVideoStartPts(videoTrack.samples);
					const audiovideoTimestampDelta = (normalizePts(audioTrack.samples[0].pts, startPTS) - startPTS) / videoTrack.inputTimeScale;
					audioTimeOffset += Math.max(0, audiovideoTimestampDelta);
					videoTimeOffset += Math.max(0, -audiovideoTimestampDelta);
				}
				if (enoughAudioSamples) {
					if (!audioTrack.samplerate) {
						this.warn("regenerate InitSegment as audio detected");
						initSegment = this.generateIS(audioTrack, videoTrack, timeOffset, accurateTimeOffset);
					}
					audio = this.remuxAudio(audioTrack, audioTimeOffset, this.isAudioContiguous, accurateTimeOffset, hasVideo || enoughVideoSamples || playlistType === PlaylistLevelType.AUDIO ? videoTimeOffset : void 0, chunkMeta);
					if (enoughVideoSamples) {
						const audioTrackLength = audio ? audio.endPTS - audio.startPTS : 0;
						if (!videoTrack.inputTimeScale) {
							this.warn("regenerate InitSegment as video detected");
							initSegment = this.generateIS(audioTrack, videoTrack, timeOffset, accurateTimeOffset);
						}
						video = this.remuxVideo(videoTrack, videoTimeOffset, isVideoContiguous, audioTrackLength, chunkMeta);
					}
				} else if (enoughVideoSamples) video = this.remuxVideo(videoTrack, videoTimeOffset, isVideoContiguous, 0, chunkMeta);
				if (video) {
					video.firstKeyFrame = firstKeyFrameIndex;
					video.independent = firstKeyFrameIndex !== -1;
					video.firstKeyFramePTS = firstKeyFramePTS;
				}
			}
		}
		if (this.ISGenerated && this._initPTS && this._initDTS) {
			if (id3Track.samples.length) id3 = flushTextTrackMetadataCueSamples(id3Track, timeOffset, this._initPTS, this._initDTS);
			if (textTrack.samples.length) text = flushTextTrackUserdataCueSamples(textTrack, timeOffset, this._initPTS);
		}
		return {
			audio,
			video,
			initSegment,
			independent,
			text,
			id3
		};
	}
	computeInitPts(basetime, timescale, presentationTime, type) {
		const offset = Math.round(presentationTime * timescale);
		let timestamp = normalizePts(basetime, offset);
		if (timestamp < offset) {
			this.log(`Adjusting PTS for rollover in timeline near ${(offset - timestamp) / timescale} ${type}`);
			while (timestamp < offset) timestamp += MPEG_TS_PTS_ROLLOVER;
		}
		return timestamp - offset;
	}
	generateIS(audioTrack, videoTrack, timeOffset, accurateTimeOffset) {
		const audioSamples = audioTrack.samples;
		const videoSamples = videoTrack.samples;
		const typeSupported = this.typeSupported;
		const tracks = {};
		const _initPTS = this._initPTS;
		const computePTSDTS = !_initPTS || accurateTimeOffset;
		let container = "audio/mp4";
		let initPTS;
		let initDTS;
		let timescale;
		let trackId = -1;
		if (computePTSDTS) initPTS = initDTS = Infinity;
		if (audioTrack.config && audioSamples.length) {
			audioTrack.timescale = audioTrack.samplerate;
			switch (audioTrack.segmentCodec) {
				case "mp3":
					if (typeSupported.mpeg) {
						container = "audio/mpeg";
						audioTrack.codec = "";
					} else if (typeSupported.mp3) audioTrack.codec = "mp3";
					break;
				case "ac3": audioTrack.codec = "ac-3";
			}
			tracks.audio = {
				id: "audio",
				container,
				codec: audioTrack.codec,
				initSegment: audioTrack.segmentCodec === "mp3" && typeSupported.mpeg ? /* @__PURE__ */ new Uint8Array(0) : MP4.initSegment([audioTrack]),
				metadata: { channelCount: audioTrack.channelCount }
			};
			if (computePTSDTS) {
				trackId = audioTrack.id;
				timescale = audioTrack.inputTimeScale;
				const initBaseTimestamp = this.computeInitPts(audioSamples[0].pts, timescale, timeOffset, "audio");
				if (!_initPTS || timescale !== _initPTS.timescale || timeOffset === 0 && initBaseTimestamp < _initPTS.baseTime) initPTS = initDTS = initBaseTimestamp;
			}
		}
		if (videoTrack.sps && videoTrack.pps && videoSamples.length) {
			videoTrack.timescale = videoTrack.inputTimeScale;
			tracks.video = {
				id: "main",
				container: "video/mp4",
				codec: videoTrack.codec,
				initSegment: MP4.initSegment([videoTrack]),
				metadata: {
					width: videoTrack.width,
					height: videoTrack.height
				}
			};
			if (computePTSDTS) {
				trackId = videoTrack.id;
				timescale = videoTrack.inputTimeScale;
				const basePTS = this.getVideoStartPts(videoSamples);
				const baseDTS = normalizePts(videoSamples[0].dts, basePTS);
				const videoInitDTS = this.computeInitPts(baseDTS, timescale, timeOffset, "video");
				const videoInitPTS = this.computeInitPts(basePTS, timescale, timeOffset, "video");
				if (!_initPTS || timescale !== _initPTS.timescale || isFiniteNumber(initPTS) || timeOffset === 0 && videoInitPTS < _initPTS.baseTime) {
					initDTS = Math.min(initDTS, videoInitDTS);
					const videoInit = !_initPTS && this.isVideoContiguous ? videoInitPTS : videoInitDTS;
					initPTS = Math.min(initPTS, videoInit);
				}
			}
			this.videoTrackConfig = {
				width: videoTrack.width,
				height: videoTrack.height,
				pixelRatio: videoTrack.pixelRatio
			};
		}
		if (Object.keys(tracks).length) {
			this.ISGenerated = true;
			if (computePTSDTS && isFiniteNumber(initPTS)) {
				if (_initPTS) this.warn(`Timestamps at playlist time: ${accurateTimeOffset ? "" : "~"}${timeOffset} ${initPTS / timescale} != initPTS: ${_initPTS.baseTime / _initPTS.timescale} (${_initPTS.baseTime}/${_initPTS.timescale}) trackId: ${_initPTS.trackId}`);
				this.log(`Found initPTS at playlist time: ${timeOffset} offset: ${initPTS / timescale} (${initPTS}/${timescale}) trackId: ${trackId}`);
				this._initPTS = {
					baseTime: initPTS,
					timescale,
					trackId
				};
				this._initDTS = {
					baseTime: initDTS,
					timescale,
					trackId
				};
			} else initPTS = timescale = void 0;
			return {
				tracks,
				initPTS,
				timescale,
				trackId
			};
		}
	}
	remuxVideo(track, timeOffset, contiguous, audioTrackLength, chunkMeta) {
		const timeScale = track.inputTimeScale;
		const inputSamples = track.samples;
		const outputSamples = [];
		const nbSamples = inputSamples.length;
		const initPTS = this._initPTS;
		const initTime = initPTS.baseTime * timeScale / initPTS.timescale;
		let nextVideoTs = this.nextVideoTs;
		let offset = 8;
		let mp4SampleDuration = this.videoSampleDuration;
		let firstDTS;
		let lastDTS;
		let minPTS = Number.POSITIVE_INFINITY;
		let maxPTS = Number.NEGATIVE_INFINITY;
		let sortSamples = false;
		if (!contiguous || nextVideoTs === null) {
			const pts = initTime + timeOffset * timeScale;
			const cts = inputSamples[0].pts - normalizePts(inputSamples[0].dts, inputSamples[0].pts);
			if (userAgentChromeVersion() && nextVideoTs !== null && Math.abs(pts - cts - (nextVideoTs + initTime)) < 15e3) contiguous = true;
			else nextVideoTs = pts - cts - initTime;
		}
		const nextVideoPts = nextVideoTs + initTime;
		for (let i = 0; i < nbSamples; i++) {
			const sample = inputSamples[i];
			sample.pts = normalizePts(sample.pts, nextVideoPts);
			sample.dts = normalizePts(sample.dts, nextVideoPts);
			if (sample.dts < inputSamples[i > 0 ? i - 1 : i].dts) sortSamples = true;
		}
		if (sortSamples) inputSamples.sort(function(a, b) {
			const deltadts = a.dts - b.dts;
			const deltapts = a.pts - b.pts;
			return deltadts || deltapts;
		});
		firstDTS = inputSamples[0].dts;
		lastDTS = inputSamples[inputSamples.length - 1].dts;
		const inputDuration = lastDTS - firstDTS;
		const averageSampleDuration = inputDuration ? Math.round(inputDuration / (nbSamples - 1)) : mp4SampleDuration || track.inputTimeScale / 30;
		if (contiguous) {
			const delta = firstDTS - nextVideoPts;
			const foundHole = delta > averageSampleDuration;
			const foundOverlap = delta < -1;
			if (foundHole || foundOverlap) {
				if (foundHole) this.warn(`${(track.segmentCodec || "").toUpperCase()}: ${toMsFromMpegTsClock(delta, true)} ms (${delta}dts) hole between fragments detected at ${timeOffset.toFixed(3)}`);
				else this.warn(`${(track.segmentCodec || "").toUpperCase()}: ${toMsFromMpegTsClock(-delta, true)} ms (${delta}dts) overlapping between fragments detected at ${timeOffset.toFixed(3)}`);
				if (!foundOverlap || nextVideoPts >= inputSamples[0].pts || userAgentChromeVersion()) {
					firstDTS = nextVideoPts;
					const firstPTS = inputSamples[0].pts - delta;
					if (foundHole) {
						inputSamples[0].dts = firstDTS;
						inputSamples[0].pts = firstPTS;
					} else {
						let isPTSOrderRetained = true;
						for (let i = 0; i < inputSamples.length; i++) {
							if (inputSamples[i].dts > firstPTS && isPTSOrderRetained) break;
							const prevPTS = inputSamples[i].pts;
							inputSamples[i].dts -= delta;
							inputSamples[i].pts -= delta;
							if (i < inputSamples.length - 1) {
								const nextSamplePTS = inputSamples[i + 1].pts;
								isPTSOrderRetained = nextSamplePTS <= inputSamples[i].pts == nextSamplePTS <= prevPTS;
							}
						}
					}
					this.log(`Video: Initial PTS/DTS adjusted: ${toMsFromMpegTsClock(firstPTS, true)}/${toMsFromMpegTsClock(firstDTS, true)}, delta: ${toMsFromMpegTsClock(delta, true)} ms`);
				}
			}
		}
		firstDTS = Math.max(0, firstDTS);
		let nbNalu = 0;
		let naluLen = 0;
		let dtsStep = firstDTS;
		for (let i = 0; i < nbSamples; i++) {
			const sample = inputSamples[i];
			const units = sample.units;
			const nbUnits = units.length;
			let sampleLen = 0;
			for (let j = 0; j < nbUnits; j++) sampleLen += units[j].data.length;
			naluLen += sampleLen;
			nbNalu += nbUnits;
			sample.length = sampleLen;
			if (sample.dts < dtsStep) {
				sample.dts = dtsStep;
				dtsStep += averageSampleDuration / 4 | 0 || 1;
			} else dtsStep = sample.dts;
			minPTS = Math.min(sample.pts, minPTS);
			maxPTS = Math.max(sample.pts, maxPTS);
		}
		lastDTS = inputSamples[nbSamples - 1].dts;
		const mdatSize = naluLen + 4 * nbNalu + 8;
		let mdat;
		try {
			mdat = new Uint8Array(mdatSize);
		} catch (err) {
			this.observer.emit(Events.ERROR, Events.ERROR, {
				type: ErrorTypes.MUX_ERROR,
				details: ErrorDetails.REMUX_ALLOC_ERROR,
				fatal: false,
				chunkMeta,
				error: err,
				bytes: mdatSize,
				reason: `fail allocating video mdat ${mdatSize}`
			});
			return;
		}
		writeUint32(mdat, 0, mdatSize);
		writeUint32(mdat, 4, types.mdat);
		let stretchedLastFrame = false;
		let minDtsDelta = Number.POSITIVE_INFINITY;
		let minPtsDelta = Number.POSITIVE_INFINITY;
		let maxDtsDelta = Number.NEGATIVE_INFINITY;
		let maxPtsDelta = Number.NEGATIVE_INFINITY;
		for (let i = 0; i < nbSamples; i++) {
			const VideoSample = inputSamples[i];
			const VideoSampleUnits = VideoSample.units;
			let mp4SampleLength = 0;
			for (let j = 0, nbUnits = VideoSampleUnits.length; j < nbUnits; j++) {
				const unit = VideoSampleUnits[j];
				const unitData = unit.data;
				const unitDataLen = unit.data.byteLength;
				writeUint32(mdat, offset, unitDataLen);
				offset += 4;
				mdat.set(unitData, offset);
				offset += unitDataLen;
				mp4SampleLength += 4 + unitDataLen;
			}
			let ptsDelta;
			if (i < nbSamples - 1) {
				mp4SampleDuration = inputSamples[i + 1].dts - VideoSample.dts;
				ptsDelta = inputSamples[i + 1].pts - VideoSample.pts;
			} else {
				const config = this.config;
				const lastFrameDuration = i > 0 ? VideoSample.dts - inputSamples[i - 1].dts : averageSampleDuration;
				ptsDelta = i > 0 ? VideoSample.pts - inputSamples[i - 1].pts : averageSampleDuration;
				if (config.stretchShortVideoTrack && this.nextAudioTs !== null) {
					const gapTolerance = Math.floor(config.maxBufferHole * timeScale);
					const deltaToFrameEnd = (audioTrackLength ? minPTS + audioTrackLength * timeScale : this.nextAudioTs + initTime) - VideoSample.pts;
					if (deltaToFrameEnd > gapTolerance) {
						mp4SampleDuration = deltaToFrameEnd - lastFrameDuration;
						if (mp4SampleDuration < 0) mp4SampleDuration = lastFrameDuration;
						else stretchedLastFrame = true;
						this.log(`It is approximately ${deltaToFrameEnd / 90} ms to the next segment; using duration ${mp4SampleDuration / 90} ms for the last video frame.`);
					} else mp4SampleDuration = lastFrameDuration;
				} else mp4SampleDuration = lastFrameDuration;
			}
			let compositionTimeOffset = Math.round(VideoSample.pts - VideoSample.dts);
			minDtsDelta = Math.min(minDtsDelta, mp4SampleDuration);
			maxDtsDelta = Math.max(maxDtsDelta, mp4SampleDuration);
			minPtsDelta = Math.min(minPtsDelta, ptsDelta);
			maxPtsDelta = Math.max(maxPtsDelta, ptsDelta);
			if (!contiguous && i === 0 && compositionTimeOffset > mp4SampleDuration) {
				const tickPaddedCompositionTime = Math.round(compositionTimeOffset / averageSampleDuration) * averageSampleDuration;
				if (tickPaddedCompositionTime - compositionTimeOffset === 1) {
					this.log(`pad first CTS ${compositionTimeOffset} -> ${tickPaddedCompositionTime} of sn: ${chunkMeta.sn}`);
					compositionTimeOffset = tickPaddedCompositionTime;
				}
			}
			outputSamples.push(createMp4Sample(VideoSample.key, mp4SampleDuration, mp4SampleLength, compositionTimeOffset));
		}
		if (outputSamples.length) {
			const chromeVersion = userAgentChromeVersion();
			if (chromeVersion) {
				if (chromeVersion < 70) {
					const flags = outputSamples[0].flags;
					flags.dependsOn = 2;
					flags.isNonSync = 0;
				}
			} else if (userAgentSafariVersion()) {
				if (maxPtsDelta - minPtsDelta < maxDtsDelta - minDtsDelta && averageSampleDuration / maxDtsDelta < .025 && outputSamples[0].cts === 0) {
					this.warn("Found irregular gaps in sample duration. Using PTS instead of DTS to determine MP4 sample duration.");
					let dts = firstDTS;
					for (let i = 0, len = outputSamples.length; i < len; i++) {
						const nextDts = dts + outputSamples[i].duration;
						const pts = dts + outputSamples[i].cts;
						if (i < len - 1) {
							const nextPts = nextDts + outputSamples[i + 1].cts;
							outputSamples[i].duration = nextPts - pts;
						} else outputSamples[i].duration = i ? outputSamples[i - 1].duration : averageSampleDuration;
						outputSamples[i].cts = 0;
						dts = nextDts;
					}
				}
			}
		}
		mp4SampleDuration = stretchedLastFrame || !mp4SampleDuration ? averageSampleDuration : mp4SampleDuration;
		const endDTS = lastDTS + mp4SampleDuration;
		this.nextVideoTs = nextVideoTs = endDTS - initTime;
		this.videoSampleDuration = mp4SampleDuration;
		this.isVideoContiguous = true;
		const data = {
			data1: MP4.moof(chunkMeta.sn, firstDTS, _extends(track, { samples: outputSamples })),
			data2: mdat,
			startPTS: (minPTS - initTime) / timeScale,
			endPTS: (maxPTS + mp4SampleDuration - initTime) / timeScale,
			startDTS: (firstDTS - initTime) / timeScale,
			endDTS: nextVideoTs / timeScale,
			type: "video",
			hasAudio: false,
			hasVideo: true,
			nb: outputSamples.length,
			dropped: track.dropped
		};
		track.samples = [];
		track.dropped = 0;
		return data;
	}
	getSamplesPerFrame(track) {
		switch (track.segmentCodec) {
			case "mp3": return MPEG_AUDIO_SAMPLE_PER_FRAME;
			case "ac3": return AC3_SAMPLES_PER_FRAME;
			default: return AAC_SAMPLES_PER_FRAME;
		}
	}
	remuxAudio(track, timeOffset, contiguous, accurateTimeOffset, videoTimeOffset, chunkMeta) {
		const inputTimeScale = track.inputTimeScale;
		const scaleFactor = inputTimeScale / (track.samplerate ? track.samplerate : inputTimeScale);
		const mp4SampleDuration = this.getSamplesPerFrame(track);
		const inputSampleDuration = mp4SampleDuration * scaleFactor;
		const initPTS = this._initPTS;
		const rawMPEG = track.segmentCodec === "mp3" && this.typeSupported.mpeg;
		const outputSamples = [];
		const alignedWithVideo = videoTimeOffset !== void 0;
		let inputSamples = track.samples;
		let offset = rawMPEG ? 0 : 8;
		let nextAudioTs = this.nextAudioTs || -1;
		const initTime = initPTS.baseTime * inputTimeScale / initPTS.timescale;
		const timeOffsetMpegTS = initTime + timeOffset * inputTimeScale;
		this.isAudioContiguous = contiguous = contiguous || inputSamples.length && nextAudioTs > 0 && (accurateTimeOffset && Math.abs(timeOffsetMpegTS - (nextAudioTs + initTime)) < 9e3 || Math.abs(normalizePts(inputSamples[0].pts, timeOffsetMpegTS) - (nextAudioTs + initTime)) < 20 * inputSampleDuration);
		inputSamples.forEach(function(sample) {
			sample.pts = normalizePts(sample.pts, timeOffsetMpegTS);
		});
		if (!contiguous || nextAudioTs < 0) {
			const sampleCount = inputSamples.length;
			inputSamples = inputSamples.filter((sample) => sample.pts >= 0);
			if (sampleCount !== inputSamples.length) this.warn(`Removed ${inputSamples.length - sampleCount} of ${sampleCount} samples (initPTS ${initTime} / ${inputTimeScale})`);
			if (!inputSamples.length) return;
			if (videoTimeOffset === 0) nextAudioTs = 0;
			else if (accurateTimeOffset && !alignedWithVideo) nextAudioTs = Math.max(0, timeOffsetMpegTS - initTime);
			else nextAudioTs = inputSamples[0].pts - initTime;
		}
		if (track.segmentCodec === "aac") {
			const maxAudioFramesDrift = this.config.maxAudioFramesDrift;
			for (let i = 0, nextPts = nextAudioTs + initTime; i < inputSamples.length; i++) {
				const sample = inputSamples[i];
				const pts = sample.pts;
				const delta = pts - nextPts;
				const duration = Math.abs(1e3 * delta / inputTimeScale);
				if (delta <= -maxAudioFramesDrift * inputSampleDuration && alignedWithVideo) {
					if (i === 0) {
						this.warn(`Audio frame @ ${(pts / inputTimeScale).toFixed(3)}s overlaps marker by ${Math.round(1e3 * delta / inputTimeScale)} ms.`);
						this.nextAudioTs = nextAudioTs = pts - initTime;
						nextPts = pts;
					}
				} else if (delta >= maxAudioFramesDrift * inputSampleDuration && duration < MAX_SILENT_FRAME_DURATION && alignedWithVideo) {
					let missing = Math.round(delta / inputSampleDuration);
					nextPts = pts - missing * inputSampleDuration;
					while (nextPts < initTime && missing && inputSampleDuration) {
						missing--;
						nextPts += inputSampleDuration;
					}
					if (i === 0) this.nextAudioTs = nextAudioTs = nextPts - initTime;
					this.warn(`Injecting ${missing} audio frames @ ${((nextPts - initTime) / inputTimeScale).toFixed(3)}s due to ${Math.round(1e3 * delta / inputTimeScale)} ms gap.`);
					for (let j = 0; j < missing; j++) {
						let fillFrame = AAC.getSilentFrame(track.parsedCodec || track.manifestCodec || track.codec, track.channelCount);
						if (!fillFrame) {
							this.log("Unable to get silent frame for given audio codec; duplicating last frame instead.");
							fillFrame = sample.unit.subarray();
						}
						inputSamples.splice(i, 0, {
							unit: fillFrame,
							pts: nextPts
						});
						nextPts += inputSampleDuration;
						i++;
					}
				}
				sample.pts = nextPts;
				nextPts += inputSampleDuration;
			}
		}
		let firstPTS = null;
		let lastPTS = null;
		let mdat;
		let mdatSize = 0;
		let sampleLength = inputSamples.length;
		while (sampleLength--) mdatSize += inputSamples[sampleLength].unit.byteLength;
		for (let j = 0, _nbSamples = inputSamples.length; j < _nbSamples; j++) {
			const audioSample = inputSamples[j];
			const unit = audioSample.unit;
			let pts = audioSample.pts;
			if (lastPTS !== null) {
				const prevSample = outputSamples[j - 1];
				prevSample.duration = Math.round((pts - lastPTS) / scaleFactor);
			} else {
				if (contiguous && track.segmentCodec === "aac") pts = nextAudioTs + initTime;
				firstPTS = pts;
				if (mdatSize > 0) {
					mdatSize += offset;
					try {
						mdat = new Uint8Array(mdatSize);
					} catch (err) {
						this.observer.emit(Events.ERROR, Events.ERROR, {
							type: ErrorTypes.MUX_ERROR,
							details: ErrorDetails.REMUX_ALLOC_ERROR,
							fatal: false,
							chunkMeta,
							error: err,
							bytes: mdatSize,
							reason: `fail allocating audio mdat ${mdatSize}`
						});
						return;
					}
					if (!rawMPEG) {
						writeUint32(mdat, 0, mdatSize);
						writeUint32(mdat, 4, types.mdat);
					}
				} else return;
			}
			if (mdat) mdat.set(unit, offset);
			const unitLen = unit.byteLength;
			offset += unitLen;
			outputSamples.push(createMp4Sample(true, mp4SampleDuration, unitLen, 0));
			lastPTS = pts;
		}
		const nbSamples = outputSamples.length;
		if (!nbSamples) return;
		const lastSample = outputSamples[outputSamples.length - 1];
		nextAudioTs = lastPTS - initTime;
		this.nextAudioTs = nextAudioTs + scaleFactor * lastSample.duration;
		const moof = rawMPEG ? /* @__PURE__ */ new Uint8Array(0) : MP4.moof(track.sequenceNumber++, firstPTS / scaleFactor, _extends({}, track, { samples: outputSamples }));
		track.samples = [];
		const start = (firstPTS - initTime) / inputTimeScale;
		const end = this.nextAudioTs / inputTimeScale;
		const audioData = {
			data1: moof,
			data2: mdat,
			startPTS: start,
			endPTS: end,
			startDTS: start,
			endDTS: end,
			type: "audio",
			hasAudio: true,
			hasVideo: false,
			nb: nbSamples
		};
		this.isAudioContiguous = true;
		return audioData;
	}
};
function normalizePts(value, reference) {
	let offset;
	if (reference === null) return value;
	if (reference < value) offset = -8589934592;
	else offset = MPEG_TS_PTS_ROLLOVER;
	while (Math.abs(value - reference) > 4294967296) value += offset;
	return value;
}
function findKeyframeIndex(samples) {
	for (let i = 0; i < samples.length; i++) if (samples[i].key) return i;
	return -1;
}
function flushTextTrackMetadataCueSamples(track, timeOffset, initPTS, initDTS) {
	const length = track.samples.length;
	if (!length) return;
	const inputTimeScale = track.inputTimeScale;
	for (let index = 0; index < length; index++) {
		const sample = track.samples[index];
		sample.pts = normalizePts(sample.pts - initPTS.baseTime * inputTimeScale / initPTS.timescale, timeOffset * inputTimeScale) / inputTimeScale;
		sample.dts = normalizePts(sample.dts - initDTS.baseTime * inputTimeScale / initDTS.timescale, timeOffset * inputTimeScale) / inputTimeScale;
	}
	const samples = track.samples;
	track.samples = [];
	return { samples };
}
function flushTextTrackUserdataCueSamples(track, timeOffset, initPTS) {
	const length = track.samples.length;
	if (!length) return;
	const inputTimeScale = track.inputTimeScale;
	for (let index = 0; index < length; index++) {
		const sample = track.samples[index];
		sample.pts = normalizePts(sample.pts - initPTS.baseTime * inputTimeScale / initPTS.timescale, timeOffset * inputTimeScale) / inputTimeScale;
	}
	track.samples.sort((a, b) => a.pts - b.pts);
	const samples = track.samples;
	track.samples = [];
	return { samples };
}
var PassThroughRemuxer = class extends Logger {
	constructor(observer, config, typeSupported, logger) {
		super("passthrough-remuxer", logger);
		this.observer = void 0;
		this.emitInitSegment = false;
		this.audioCodec = void 0;
		this.videoCodec = void 0;
		this.initData = void 0;
		this.initPTS = null;
		this.initTracks = void 0;
		this.lastEndTime = null;
		this.isVideoContiguous = false;
		this.videoOnlyRemux = false;
		this.decryptdata = null;
		this.pendingInitSegment = void 0;
		this.observer = observer;
	}
	destroy() {
		if (this.observer) this.observer.removeAllListeners();
		this.observer = null;
	}
	resetTimeStamp(defaultInitPTS) {
		this.lastEndTime = null;
		const initPTS = this.initPTS;
		if (initPTS && defaultInitPTS) {
			if (initPTS.baseTime === defaultInitPTS.baseTime && initPTS.timescale === defaultInitPTS.timescale) return;
		}
		this.initPTS = defaultInitPTS;
	}
	resetNextTimestamp() {
		this.isVideoContiguous = false;
		this.lastEndTime = null;
	}
	resetInitSegment(initSegment, audioCodec, videoCodec, decryptdata) {
		this.audioCodec = audioCodec;
		this.videoCodec = videoCodec;
		this.decryptdata = decryptdata;
		this.pendingInitSegment = initSegment;
		this.videoOnlyRemux = false;
		this.initTracks = void 0;
		this.initData = void 0;
		this.emitInitSegment = true;
	}
	generateInitSegment(initSegment, decryptdata, parsedInitData) {
		this.videoOnlyRemux = false;
		let { audioCodec, videoCodec } = this;
		if (!(initSegment != null && initSegment.byteLength)) {
			this.initTracks = void 0;
			this.initData = void 0;
			return;
		}
		const { audio, video } = this.initData = parsedInitData || parseInitSegment(initSegment);
		if (decryptdata) patchEncyptionData(initSegment, decryptdata);
		else {
			const eitherTrack = audio || video;
			if (eitherTrack != null && eitherTrack.encrypted) this.warn(`Init segment with encrypted track with has no key ("${eitherTrack.codec}")!`);
		}
		if (audio) audioCodec = getParsedTrackCodec(audio, ElementaryStreamTypes.AUDIO, this);
		if (video) videoCodec = getParsedTrackCodec(video, ElementaryStreamTypes.VIDEO, this);
		const tracks = {};
		if (audio && video) tracks.audiovideo = {
			container: "video/mp4",
			codec: audioCodec + "," + videoCodec,
			supplemental: video.supplemental,
			encrypted: video.encrypted,
			initSegment,
			id: "main"
		};
		else if (audio) tracks.audio = {
			container: "audio/mp4",
			codec: audioCodec,
			encrypted: audio.encrypted,
			initSegment,
			id: "audio"
		};
		else if (video) tracks.video = {
			container: "video/mp4",
			codec: videoCodec,
			supplemental: video.supplemental,
			encrypted: video.encrypted,
			initSegment,
			id: "main"
		};
		else this.warn("initSegment does not contain moov or trak boxes.");
		this.initTracks = tracks;
	}
	remux(audioTrack, videoTrack, id3Track, textTrack, timeOffset, accurateTimeOffset, flush, playlistType, chunkMeta, parsedInitData, parsedSampleData) {
		var _initData, _initData2;
		let { initPTS, lastEndTime } = this;
		const result = {
			audio: void 0,
			video: void 0,
			text: void 0,
			id3: id3Track,
			initSegment: void 0
		};
		if (!isFiniteNumber(lastEndTime)) lastEndTime = this.lastEndTime = timeOffset || 0;
		const data = videoTrack.samples;
		if (!data.length) return result;
		const pendingInitSegment = this.pendingInitSegment;
		if (pendingInitSegment) {
			this.pendingInitSegment = void 0;
			this.generateInitSegment(pendingInitSegment, this.decryptdata, parsedInitData);
		}
		const initSegment = {
			initPTS: void 0,
			timescale: void 0,
			trackId: void 0
		};
		let initData = this.initData;
		if (!((_initData = initData) != null && _initData.length)) {
			this.generateInitSegment(data);
			initData = this.initData;
		}
		if (!((_initData2 = initData) != null && _initData2.length)) {
			this.warn("Failed to generate initSegment.");
			return result;
		}
		if (this.emitInitSegment) {
			initSegment.tracks = this.initTracks;
			result.initSegment = initSegment;
			this.emitInitSegment = false;
		}
		const trackSampleData = parsedSampleData && true ? parsedSampleData.tracks : getSampleData(data, initData, chunkMeta, this, false);
		const audioSampleTimestamps = initData.audio ? trackSampleData[initData.audio.id] : null;
		const videoSampleTimestamps = initData.video ? trackSampleData[initData.video.id] : null;
		const hasAudio = !!initData.audio;
		const hasVideo = !!initData.video;
		let type = "";
		if (hasAudio) type += "audio";
		if (hasVideo) type += "video";
		const videoStartTime = toStartEndOrDefault(videoSampleTimestamps, Infinity);
		const audioStartTime = toStartEndOrDefault(audioSampleTimestamps, Infinity);
		const videoEndTime = toStartEndOrDefault(videoSampleTimestamps, 0, true);
		const audioEndTime = toStartEndOrDefault(audioSampleTimestamps, 0, true);
		let decodeTime = timeOffset;
		let duration = 0;
		if (videoSampleTimestamps && audioSampleTimestamps && initData.audio && (audioStartTime > videoEndTime || videoStartTime > audioEndTime)) this.warn(`audio and video track sample timestamps do not overlap. v: ${videoStartTime}-${videoEndTime} a: ${audioStartTime}-${audioEndTime}}`, videoSampleTimestamps, audioSampleTimestamps);
		const syncOnAudio = !!audioSampleTimestamps && (!videoSampleTimestamps || !initPTS && audioStartTime < videoStartTime || !!initPTS && initPTS.trackId === initData.audio.id);
		const baseOffsetSamples = syncOnAudio ? audioSampleTimestamps : videoSampleTimestamps;
		if (!baseOffsetSamples) {
			this.log(`No media samples found in ${playlistType} ${chunkMeta.level} ${chunkMeta.part === -1 ? "" : `part: ${chunkMeta.part} of`} sn: ${chunkMeta.sn} at playlist time: ${timeOffset}`);
			return result;
		}
		let data1 = data;
		let data2;
		duration = syncOnAudio ? audioEndTime - audioStartTime : videoEndTime - videoStartTime;
		const timescale = baseOffsetSamples.timescale;
		const baseTime = baseOffsetSamples.start - timeOffset * timescale;
		const trackId = syncOnAudio ? initData.audio.id : initData.video.id;
		decodeTime = baseOffsetSamples.start / timescale;
		if (!(!!initPTS && chunkMeta.id > 1) && (accurateTimeOffset || !initPTS) && (isInvalidInitPts(initPTS, decodeTime, timeOffset, duration) || timescale !== initPTS.timescale)) {
			let detectedDrift = false;
			const trackType = syncOnAudio ? "audio" : "video";
			if (initPTS) {
				const driftEstimate = timeOffset !== 0 ? decodeTime / timeOffset : 1 + decodeTime / 1;
				detectedDrift = decodeTime >= 0 && Math.abs(1 - driftEstimate) < .001;
				this.log(`${trackType} timestamps in track ${trackId} at playlist time: ${accurateTimeOffset ? "" : "~"}${timeOffset} maps to ${decodeTime} with initPTS: ${initPTS.baseTime / initPTS.timescale} (${baseTime / timescale - initPTS.baseTime / initPTS.timescale}s diff) (${type}) drift estimate: ${driftEstimate} ${detectedDrift ? "(ignoring drift)" : "remapping timestamps (initPTS)"}`);
			}
			if (!detectedDrift) {
				this.log(`Found initPTS in ${trackType} track ${trackId} at playlist time: ${timeOffset} offset: ${decodeTime - timeOffset} (${baseTime}/${timescale})`);
				initPTS = null;
				initSegment.initPTS = baseTime;
				initSegment.timescale = timescale;
				initSegment.trackId = trackId;
			}
		}
		if (!initPTS) {
			if (!initSegment.timescale || initSegment.trackId === void 0 || initSegment.initPTS === void 0) {
				this.warn("Could not set initPTS");
				initSegment.initPTS = decodeTime;
				initSegment.timescale = 1;
				initSegment.trackId = -1;
			}
			this.initPTS = initPTS = {
				baseTime: initSegment.initPTS,
				timescale: initSegment.timescale,
				trackId: initSegment.trackId
			};
		} else {
			initSegment.initPTS = initPTS.baseTime;
			initSegment.timescale = initPTS.timescale;
			initSegment.trackId = initPTS.trackId;
		}
		const startDTS = decodeTime - initPTS.baseTime / initPTS.timescale;
		const endDTS = startDTS + duration;
		const startPTS = hasVideo && (baseOffsetSamples == null ? void 0 : baseOffsetSamples.ptsMin) !== void 0 ? baseOffsetSamples.ptsMin / baseOffsetSamples.timescale - initPTS.baseTime / initPTS.timescale : startDTS;
		const endPTS = hasVideo && baseOffsetSamples != null && baseOffsetSamples.ptsMax ? baseOffsetSamples.ptsMax / baseOffsetSamples.timescale - initPTS.baseTime / initPTS.timescale : endDTS;
		if (duration > 0) this.lastEndTime = endDTS;
		else {
			this.warn("Duration parsed from mp4 should be greater than zero");
			this.resetNextTimestamp();
		}
		const encrypted = (initData.audio ? initData.audio.encrypted : false) || (initData.video ? initData.video.encrypted : false);
		const track = {
			data1,
			data2,
			startPTS,
			startDTS,
			endPTS,
			endDTS,
			type,
			hasAudio,
			hasVideo,
			nb: 1,
			dropped: 0,
			encrypted
		};
		result.audio = hasAudio && !hasVideo ? track : void 0;
		result.video = hasVideo ? track : void 0;
		const isVideoContiguous = this.isVideoContiguous;
		const videoSampleCount = videoSampleTimestamps == null ? void 0 : videoSampleTimestamps.sampleCount;
		if (videoSampleCount) {
			const firstKeyFrame = videoSampleTimestamps.keyFrameIndex;
			const independent = firstKeyFrame !== -1;
			track.nb = videoSampleCount;
			track.dropped = firstKeyFrame === 0 || isVideoContiguous ? 0 : independent ? firstKeyFrame : videoSampleCount;
			track.independent = independent;
			track.firstKeyFrame = firstKeyFrame;
			if (independent && videoSampleTimestamps.keyFrameStart) track.firstKeyFramePTS = (videoSampleTimestamps.keyFrameStart - initPTS.baseTime) / initPTS.timescale;
			if (!isVideoContiguous) result.independent = independent;
			this.isVideoContiguous || (this.isVideoContiguous = independent);
			if (track.dropped) this.warn(`fmp4 does not start with IDR: firstIDR ${firstKeyFrame}/${videoSampleCount} dropped: ${track.dropped} start: ${track.firstKeyFramePTS || "NA"}`);
		}
		result.initSegment = initSegment;
		result.id3 = flushTextTrackMetadataCueSamples(id3Track, timeOffset, initPTS, initPTS);
		if (textTrack.samples.length) result.text = flushTextTrackUserdataCueSamples(textTrack, timeOffset, initPTS);
		return result;
	}
};
function toStartEndOrDefault(trackTimes, defaultValue, end = false) {
	return (trackTimes == null ? void 0 : trackTimes.start) !== void 0 ? (trackTimes.start + (end ? trackTimes.duration : 0)) / trackTimes.timescale : defaultValue;
}
function isInvalidInitPts(initPTS, startDTS, timeOffset, duration) {
	if (initPTS === null) return true;
	const minDuration = Math.max(duration, 1);
	const startTime = startDTS - initPTS.baseTime / initPTS.timescale;
	return Math.abs(startTime - timeOffset) >= minDuration;
}
function getParsedTrackCodec(track, type, logger) {
	const parsedCodec = track.codec;
	if (parsedCodec && parsedCodec.length > 4) return parsedCodec;
	if (type === ElementaryStreamTypes.AUDIO) {
		if (parsedCodec === "ec-3" || parsedCodec === "ac-3" || parsedCodec === "alac") return parsedCodec;
		if (parsedCodec === "fLaC" || parsedCodec === "Opus") return getCodecCompatibleName(parsedCodec, false);
		logger.warn(`Unhandled audio codec "${parsedCodec}" in mp4 MAP`);
		return parsedCodec || "mp4a";
	} else if (parsedCodec === "mjpg") return parsedCodec;
	logger.warn(`Unhandled video codec "${parsedCodec}" in mp4 MAP`);
	return parsedCodec || "avc1";
}
var now;
try {
	now = self.performance.now.bind(self.performance);
} catch (err) {
	now = Date.now;
}
var muxConfig = [
	{
		demux: MP4Demuxer,
		remux: PassThroughRemuxer
	},
	{
		demux: TSDemuxer,
		remux: MP4Remuxer
	},
	{
		demux: AACDemuxer,
		remux: MP4Remuxer
	},
	{
		demux: MP3Demuxer,
		remux: MP4Remuxer
	}
];
var Transmuxer = class {
	constructor(observer, typeSupported, config, vendor, id, logger) {
		this.asyncResult = false;
		this.logger = void 0;
		this.observer = void 0;
		this.typeSupported = void 0;
		this.config = void 0;
		this.id = void 0;
		this.demuxer = void 0;
		this.remuxer = void 0;
		this.decrypter = void 0;
		this.probe = void 0;
		this.decryptionPromise = null;
		this.transmuxConfig = void 0;
		this.currentTransmuxState = void 0;
		this.observer = observer;
		this.typeSupported = typeSupported;
		this.config = config;
		this.id = id;
		this.logger = logger;
	}
	configure(transmuxConfig) {
		this.transmuxConfig = transmuxConfig;
		if (this.decrypter) this.decrypter.reset();
	}
	push(data, decryptdata, chunkMeta, state) {
		if (!this.observer) return emptyResult(chunkMeta);
		const stats = chunkMeta.transmuxing;
		stats.executeStart = now();
		const uintData = new Uint8Array(data);
		const { currentTransmuxState, transmuxConfig } = this;
		if (state) this.currentTransmuxState = state;
		const { contiguous, discontinuity, trackSwitch, accurateTimeOffset, timeOffset, initSegmentChange } = state || currentTransmuxState;
		const { audioCodec, videoCodec, defaultInitPts, duration, initSegmentData } = transmuxConfig;
		const keyData = getEncryptionType(uintData, decryptdata);
		if (keyData && isFullSegmentEncryption(keyData.method)) {
			const decrypter = this.getDecrypter();
			const aesMode = getAesModeFromFullSegmentMethod(keyData.method);
			this.asyncResult = true;
			this.decryptionPromise = decrypter.decrypt(uintData, keyData.key.buffer, keyData.iv.buffer, aesMode, chunkMeta.decryptRange).then((decryptedData) => {
				const result = this.push(decryptedData, null, chunkMeta);
				this.decryptionPromise = null;
				return result;
			});
			return this.decryptionPromise;
		}
		const resetMuxers = this.needsProbing(discontinuity, trackSwitch);
		if (resetMuxers) {
			const segmentFormatData = chunkMeta.iframe && initSegmentData && TSDemuxer.probe(initSegmentData, this.logger) ? initSegmentData : uintData;
			const error = this.configureTransmuxer(segmentFormatData);
			if (error) {
				this.logger.warn(`[transmuxer] ${error.message}`);
				this.observer.emit(Events.ERROR, Events.ERROR, {
					type: ErrorTypes.MEDIA_ERROR,
					details: ErrorDetails.FRAG_PARSING_ERROR,
					fatal: false,
					error,
					reason: error.message
				});
				stats.executeEnd = now();
				return emptyResult(chunkMeta);
			}
		}
		if (discontinuity || trackSwitch || initSegmentChange || resetMuxers) this.resetInitSegment(initSegmentData, audioCodec, videoCodec, duration, decryptdata, chunkMeta);
		if (discontinuity || initSegmentChange || resetMuxers) this.resetInitialTimestamp(defaultInitPts);
		if (!contiguous) this.resetContiguity();
		const result = this.transmux(uintData, keyData, timeOffset, accurateTimeOffset, chunkMeta);
		this.asyncResult = isPromise(result);
		const currentState = this.currentTransmuxState;
		currentState.contiguous = true;
		currentState.discontinuity = false;
		currentState.trackSwitch = false;
		stats.executeEnd = now();
		return result;
	}
	flush(chunkMeta) {
		const stats = chunkMeta.transmuxing;
		stats.executeStart = now();
		const { decrypter, currentTransmuxState, decryptionPromise } = this;
		if (decryptionPromise) {
			this.asyncResult = true;
			return decryptionPromise.then(() => {
				return this.flush(chunkMeta);
			});
		}
		const transmuxResults = [];
		const { timeOffset } = currentTransmuxState;
		if (decrypter) {
			const decryptedData = decrypter.flush();
			if (decryptedData) transmuxResults.push(this.push(decryptedData.buffer, null, chunkMeta));
		}
		const { demuxer, remuxer } = this;
		if (!demuxer || !remuxer) {
			stats.executeEnd = now();
			const emptyResults = [emptyResult(chunkMeta)];
			if (this.asyncResult) return Promise.resolve(emptyResults);
			return emptyResults;
		}
		const demuxResultOrPromise = demuxer.flush(timeOffset, chunkMeta);
		if (isPromise(demuxResultOrPromise)) {
			this.asyncResult = true;
			return demuxResultOrPromise.then((demuxResult) => {
				this.flushRemux(transmuxResults, demuxResult, chunkMeta);
				return transmuxResults;
			});
		}
		this.flushRemux(transmuxResults, demuxResultOrPromise, chunkMeta);
		if (this.asyncResult) return Promise.resolve(transmuxResults);
		return transmuxResults;
	}
	flushRemux(transmuxResults, demuxResult, chunkMeta) {
		if (!this.remuxer) return;
		const { audioTrack, videoTrack, id3Track, textTrack } = demuxResult;
		const { accurateTimeOffset, timeOffset } = this.currentTransmuxState;
		this.logger.log(`[transmuxer.ts]: Flushed ${this.id} sn: ${chunkMeta.sn}${chunkMeta.part > -1 ? " part: " + chunkMeta.part : ""} of ${this.id} playlist ${chunkMeta.level}`);
		const remuxResult = this.remuxer.remux(audioTrack, videoTrack, id3Track, textTrack, timeOffset, accurateTimeOffset, true, this.id, chunkMeta, demuxResult.initData, demuxResult.sampleData);
		transmuxResults.push({
			remuxResult,
			chunkMeta
		});
		chunkMeta.transmuxing.executeEnd = now();
	}
	resetInitialTimestamp(defaultInitPts) {
		const { demuxer, remuxer } = this;
		if (!demuxer || !remuxer) return;
		demuxer.resetTimeStamp(defaultInitPts);
		remuxer.resetTimeStamp(defaultInitPts);
	}
	resetContiguity() {
		const { demuxer, remuxer } = this;
		if (!demuxer || !remuxer) return;
		demuxer.resetContiguity();
		remuxer.resetNextTimestamp();
	}
	resetInitSegment(initSegmentData, audioCodec, videoCodec, trackDuration, decryptdata, chunkMeta) {
		const { demuxer, remuxer } = this;
		if (!demuxer || !remuxer) return;
		demuxer.resetInitSegment(initSegmentData, audioCodec, videoCodec, trackDuration, decryptdata, chunkMeta);
		remuxer.resetInitSegment(initSegmentData, audioCodec, videoCodec, decryptdata);
	}
	destroy() {
		if (this.demuxer) {
			this.demuxer.destroy();
			this.demuxer = void 0;
		}
		if (this.remuxer) {
			this.remuxer.destroy();
			this.remuxer = void 0;
		}
		if (this.observer) this.observer.removeAllListeners();
		this.decryptionPromise = null;
		this.decrypter = this.observer = void 0;
		this.logger = this.config = this.probe = void 0;
	}
	transmux(data, keyData, timeOffset, accurateTimeOffset, chunkMeta) {
		let result;
		if ((keyData == null ? void 0 : keyData.method) === "SAMPLE-AES") result = this.transmuxSampleAes(data, keyData, timeOffset, accurateTimeOffset, chunkMeta);
		else result = this.transmuxUnencrypted(data, timeOffset, accurateTimeOffset, chunkMeta);
		return result;
	}
	transmuxUnencrypted(data, timeOffset, accurateTimeOffset, chunkMeta) {
		const { demuxer, remuxer } = this;
		if (!demuxer || !remuxer) return emptyResult(chunkMeta);
		const demuxResult = demuxer.demux(data, timeOffset, chunkMeta, false, !this.config.progressive);
		const { audioTrack, videoTrack, id3Track, textTrack } = demuxResult;
		return {
			remuxResult: remuxer.remux(audioTrack, videoTrack, id3Track, textTrack, timeOffset, accurateTimeOffset, false, this.id, chunkMeta, demuxResult.initData, demuxResult.sampleData),
			chunkMeta
		};
	}
	transmuxSampleAes(data, decryptData, timeOffset, accurateTimeOffset, chunkMeta) {
		if (!this.demuxer) return Promise.reject(/* @__PURE__ */ new Error("no demuxer"));
		return this.demuxer.demuxSampleAes(data, decryptData, timeOffset, chunkMeta).then((demuxResult) => {
			return {
				remuxResult: this.remuxer.remux(demuxResult.audioTrack, demuxResult.videoTrack, demuxResult.id3Track, demuxResult.textTrack, timeOffset, accurateTimeOffset, false, this.id, chunkMeta, demuxResult.initData, demuxResult.sampleData),
				chunkMeta
			};
		});
	}
	configureTransmuxer(data) {
		const { config, observer, typeSupported } = this;
		if (!observer) return;
		let mux;
		try {
			for (let i = 0, len = muxConfig.length; i < len; i++) {
				var _muxConfig$i$demux;
				if ((_muxConfig$i$demux = muxConfig[i].demux) != null && _muxConfig$i$demux.probe(data, this.logger)) {
					mux = muxConfig[i];
					break;
				}
			}
		} catch (error) {
			return error;
		}
		if (!mux) return /* @__PURE__ */ new Error("Failed to find demuxer by probing fragment data");
		const demuxer = this.demuxer;
		const remuxer = this.remuxer;
		const Demuxer = mux.demux;
		const Remuxer = mux.remux;
		if (!demuxer || !(demuxer instanceof Demuxer)) {
			this.logger.log(`Using ${Demuxer.name}`);
			this.demuxer = new Demuxer(observer, config, typeSupported, this.logger);
			this.probe = Demuxer.probe;
		}
		if (!remuxer || !(remuxer instanceof Remuxer)) {
			this.logger.log(`Using ${Remuxer.name}`);
			this.remuxer = new Remuxer(observer, config, typeSupported, this.logger);
		}
	}
	needsProbing(discontinuity, trackSwitch) {
		return !this.demuxer || !this.remuxer || discontinuity || trackSwitch;
	}
	getDecrypter() {
		let decrypter = this.decrypter;
		if (!decrypter) decrypter = this.decrypter = new Decrypter(this.config);
		return decrypter;
	}
};
function getEncryptionType(data, decryptData) {
	let encryptionType = null;
	if (data.byteLength > 0 && (decryptData == null ? void 0 : decryptData.key) != null && decryptData.iv !== null && decryptData.method != null) encryptionType = decryptData;
	return encryptionType;
}
var emptyResult = (chunkMeta) => ({
	remuxResult: {},
	chunkMeta
});
function isPromise(p) {
	return "then" in p && p.then instanceof Function;
}
var TransmuxConfig = class {
	constructor(audioCodec, videoCodec, initSegmentData, duration, defaultInitPts) {
		this.audioCodec = void 0;
		this.videoCodec = void 0;
		this.initSegmentData = void 0;
		this.duration = void 0;
		this.defaultInitPts = void 0;
		this.audioCodec = audioCodec;
		this.videoCodec = videoCodec;
		this.initSegmentData = initSegmentData;
		this.duration = duration;
		this.defaultInitPts = defaultInitPts || null;
	}
};
var TransmuxState = class {
	constructor(discontinuity, contiguous, accurateTimeOffset, trackSwitch, timeOffset, initSegmentChange) {
		this.discontinuity = void 0;
		this.contiguous = void 0;
		this.accurateTimeOffset = void 0;
		this.trackSwitch = void 0;
		this.timeOffset = void 0;
		this.initSegmentChange = void 0;
		this.discontinuity = discontinuity;
		this.contiguous = contiguous;
		this.accurateTimeOffset = accurateTimeOffset;
		this.trackSwitch = trackSwitch;
		this.timeOffset = timeOffset;
		this.initSegmentChange = initSegmentChange;
	}
};
var transmuxerInstanceCount = 0;
var TransmuxerInterface = class {
	constructor(_hls, id, onTransmuxComplete, onFlush) {
		this.error = null;
		this.hls = void 0;
		this.id = void 0;
		this.instanceNo = transmuxerInstanceCount++;
		this.observer = void 0;
		this.frag = null;
		this.part = null;
		this.useWorker = void 0;
		this.workerContext = null;
		this.transmuxer = null;
		this.onTransmuxComplete = void 0;
		this.onFlush = void 0;
		this.onWorkerMessage = (event) => {
			const data = event.data;
			const hls = this.hls;
			if (!hls || !(data != null && data.event) || data.instanceNo !== this.instanceNo) return;
			switch (data.event) {
				case "init": {
					var _this$workerContext;
					const objectURL = (_this$workerContext = this.workerContext) == null ? void 0 : _this$workerContext.objectURL;
					if (objectURL) self.URL.revokeObjectURL(objectURL);
					break;
				}
				case "transmuxComplete":
					this.handleTransmuxComplete(data.data);
					break;
				case "flush":
					this.onFlush(data.data);
					break;
				case "workerLog":
					if (hls.logger[data.data.logType]) hls.logger[data.data.logType](data.data.message);
					break;
				default:
					data.data = data.data || {};
					data.data.frag = this.frag;
					data.data.part = this.part;
					data.data.id = this.id;
					hls.trigger(data.event, data.data);
			}
		};
		this.onWorkerError = (event) => {
			if (!this.hls) return;
			const error = /* @__PURE__ */ new Error(`${event.message}  (${event.filename}:${event.lineno})`);
			this.hls.config.enableWorker = false;
			this.hls.logger.warn(`Error in "${this.id}" Web Worker, fallback to inline`);
			this.hls.trigger(Events.ERROR, {
				type: ErrorTypes.OTHER_ERROR,
				details: ErrorDetails.INTERNAL_EXCEPTION,
				fatal: false,
				event: "demuxerWorker",
				error
			});
		};
		const config = _hls.config;
		this.hls = _hls;
		this.id = id;
		this.useWorker = !!config.enableWorker;
		this.onTransmuxComplete = onTransmuxComplete;
		this.onFlush = onFlush;
		const forwardMessage = (ev, data) => {
			data = data || {};
			data.frag = this.frag || void 0;
			if (ev === Events.ERROR) {
				data = data;
				data.parent = this.id;
				data.part = this.part;
				this.error = data.error;
			}
			this.hls.trigger(ev, data);
		};
		this.observer = new EventEmitter();
		this.observer.on(Events.FRAG_DECRYPTED, forwardMessage);
		this.observer.on(Events.ERROR, forwardMessage);
		const m2tsTypeSupported = getM2TSSupportedAudioTypes(config.preferManagedMediaSource);
		if (this.useWorker && typeof Worker !== "undefined") {
			const logger = this.hls.logger;
			if (config.workerPath || hasUMDWorker()) {
				try {
					if (config.workerPath) {
						logger.log(`loading Web Worker ${config.workerPath} for "${id}"`);
						this.workerContext = loadWorker(config.workerPath);
					} else {
						logger.log(`injecting Web Worker for "${id}"`);
						this.workerContext = injectWorker();
					}
					const { worker } = this.workerContext;
					worker.addEventListener("message", this.onWorkerMessage);
					worker.addEventListener("error", this.onWorkerError);
					worker.postMessage({
						instanceNo: this.instanceNo,
						cmd: "init",
						typeSupported: m2tsTypeSupported,
						id,
						config: stringify(config)
					});
				} catch (err) {
					logger.warn(`Error setting up "${id}" Web Worker, fallback to inline`, err);
					this.terminateWorker();
					this.error = null;
					this.transmuxer = new Transmuxer(this.observer, m2tsTypeSupported, config, "", id, _hls.logger);
				}
				return;
			}
		}
		this.transmuxer = new Transmuxer(this.observer, m2tsTypeSupported, config, "", id, _hls.logger);
	}
	reset() {
		this.frag = null;
		this.part = null;
		if (this.workerContext) {
			const instanceNo = this.instanceNo;
			this.instanceNo = transmuxerInstanceCount++;
			const config = this.hls.config;
			const m2tsTypeSupported = getM2TSSupportedAudioTypes(config.preferManagedMediaSource);
			this.workerContext.worker.postMessage({
				instanceNo: this.instanceNo,
				cmd: "reset",
				resetNo: instanceNo,
				typeSupported: m2tsTypeSupported,
				id: this.id,
				config: stringify(config)
			});
		}
	}
	terminateWorker() {
		if (this.workerContext) {
			const { worker } = this.workerContext;
			this.workerContext = null;
			worker.removeEventListener("message", this.onWorkerMessage);
			worker.removeEventListener("error", this.onWorkerError);
			removeWorkerFromStore(this.hls.config.workerPath);
		}
	}
	destroy() {
		if (this.workerContext) {
			this.terminateWorker();
			this.onWorkerMessage = this.onWorkerError = null;
		} else {
			const transmuxer = this.transmuxer;
			if (transmuxer) {
				transmuxer.destroy();
				this.transmuxer = null;
			}
		}
		const observer = this.observer;
		if (observer) observer.removeAllListeners();
		this.frag = null;
		this.part = null;
		this.observer = null;
		this.hls = null;
	}
	push(data, initSegmentData, audioCodec, videoCodec, frag, part, duration, accurateTimeOffset, chunkMeta, defaultInitPTS) {
		var _frag$initSegment, _lastFrag$initSegment;
		chunkMeta.transmuxing.start = self.performance.now();
		const { instanceNo, transmuxer } = this;
		const timeOffset = part ? part.start : frag.start;
		const decryptdata = frag.decryptdata;
		const lastFrag = this.frag;
		const discontinuity = lastFrag ? frag.cc !== lastFrag.cc : true;
		const trackSwitch = lastFrag ? chunkMeta.level !== lastFrag.level : true;
		const snDiff = lastFrag ? chunkMeta.sn - lastFrag.sn : -1;
		const partDiff = this.part ? chunkMeta.part - this.part.index : -1;
		const progressive = snDiff === 0 && chunkMeta.id > 1 && chunkMeta.id === (lastFrag == null ? void 0 : lastFrag.stats.chunkCount);
		const contiguous = !trackSwitch && (snDiff === 1 || snDiff === 0 && (partDiff === 1 || progressive && partDiff <= 0));
		const now = self.performance.now();
		if (trackSwitch || snDiff || frag.stats.parsing.start === 0) frag.stats.parsing.start = now;
		if (part && (partDiff || !contiguous)) part.stats.parsing.start = now;
		const initSegmentChange = !(lastFrag && ((_frag$initSegment = frag.initSegment) == null ? void 0 : _frag$initSegment.url) === ((_lastFrag$initSegment = lastFrag.initSegment) == null ? void 0 : _lastFrag$initSegment.url));
		const state = new TransmuxState(discontinuity, contiguous, accurateTimeOffset, trackSwitch, timeOffset, initSegmentChange);
		if (!contiguous || discontinuity || initSegmentChange) {
			this.hls.logger.log(`[transmuxer-interface]: Starting new transmux session for ${frag.type} sn: ${chunkMeta.sn}${chunkMeta.part > -1 ? " part: " + chunkMeta.part : ""} ${this.id} playlist: ${chunkMeta.level} id: ${chunkMeta.id}
        discontinuity: ${discontinuity}
        trackSwitch: ${trackSwitch}
        contiguous: ${contiguous}
        accurateTimeOffset: ${accurateTimeOffset}
        timeOffset: ${timeOffset}
        initSegmentChange: ${initSegmentChange}`);
			const config = new TransmuxConfig(audioCodec, videoCodec, initSegmentData, duration, defaultInitPTS);
			this.configureTransmuxer(config);
		}
		this.frag = frag;
		this.part = part;
		if (this.workerContext) this.workerContext.worker.postMessage({
			instanceNo,
			cmd: "demux",
			data,
			decryptdata,
			chunkMeta,
			state
		}, data instanceof ArrayBuffer ? [data] : []);
		else if (transmuxer) {
			const transmuxResult = transmuxer.push(data, decryptdata, chunkMeta, state);
			if (isPromise(transmuxResult)) transmuxResult.then((data) => {
				this.handleTransmuxComplete(data);
			}).catch((error) => {
				this.transmuxerError(error, chunkMeta, "transmuxer-interface push error");
			});
			else this.handleTransmuxComplete(transmuxResult);
		}
	}
	flush(chunkMeta) {
		chunkMeta.transmuxing.start = self.performance.now();
		const { instanceNo, transmuxer } = this;
		if (this.workerContext) this.workerContext.worker.postMessage({
			instanceNo,
			cmd: "flush",
			chunkMeta
		});
		else if (transmuxer) {
			const transmuxResult = transmuxer.flush(chunkMeta);
			if (isPromise(transmuxResult)) transmuxResult.then((data) => {
				this.handleFlushResult(data, chunkMeta);
			}).catch((error) => {
				this.transmuxerError(error, chunkMeta, "transmuxer-interface flush error");
			});
			else this.handleFlushResult(transmuxResult, chunkMeta);
		}
	}
	transmuxerError(error, chunkMeta, reason) {
		if (!this.hls) return;
		this.error = error;
		this.hls.trigger(Events.ERROR, {
			type: ErrorTypes.MEDIA_ERROR,
			details: ErrorDetails.FRAG_PARSING_ERROR,
			chunkMeta,
			frag: this.frag || void 0,
			part: this.part || void 0,
			fatal: false,
			error,
			err: error,
			reason
		});
	}
	handleFlushResult(results, chunkMeta) {
		results.forEach((result) => {
			this.handleTransmuxComplete(result);
		});
		this.onFlush(chunkMeta);
	}
	configureTransmuxer(config) {
		const { instanceNo, transmuxer } = this;
		if (this.workerContext) this.workerContext.worker.postMessage({
			instanceNo,
			cmd: "configure",
			config
		});
		else if (transmuxer) transmuxer.configure(config);
	}
	handleTransmuxComplete(result) {
		result.chunkMeta.transmuxing.end = self.performance.now();
		this.onTransmuxComplete(result);
	}
};
function getSourceBuffer() {
	return self.SourceBuffer || self.WebKitSourceBuffer;
}
function isMSESupported() {
	if (!getMediaSource()) return false;
	const sourceBuffer = getSourceBuffer();
	return !sourceBuffer || sourceBuffer.prototype && typeof sourceBuffer.prototype.appendBuffer === "function" && typeof sourceBuffer.prototype.remove === "function";
}
function isSupported() {
	if (!isMSESupported()) return false;
	const mediaSource = getMediaSource();
	return typeof (mediaSource == null ? void 0 : mediaSource.isTypeSupported) === "function" && ([
		"avc1.42E01E,mp4a.40.2",
		"av01.0.01M.08",
		"vp09.00.50.08"
	].some((codecsForVideoContainer) => mediaSource.isTypeSupported(mimeTypeForCodec(codecsForVideoContainer, "video"))) || ["mp4a.40.2", "fLaC"].some((codecForAudioContainer) => mediaSource.isTypeSupported(mimeTypeForCodec(codecForAudioContainer, "audio"))));
}
function changeTypeSupported() {
	var _sourceBuffer$prototy;
	const sourceBuffer = getSourceBuffer();
	return typeof (sourceBuffer == null || (_sourceBuffer$prototy = sourceBuffer.prototype) == null ? void 0 : _sourceBuffer$prototy.changeType) === "function";
}
var AlternateAudio = {
	DISABLED: 0,
	SWITCHING: 1,
	SWITCHED: 2
};
var TICK_INTERVAL = 100;
var StreamController = class extends BaseStreamController {
	constructor(hls, fragmentTracker, keyLoader) {
		super(hls, fragmentTracker, keyLoader, "stream-controller", PlaylistLevelType.MAIN);
		this.audioCodecSwap = false;
		this.level = -1;
		this._forceStartLoad = false;
		this._hasEnoughToStart = false;
		this.altAudio = AlternateAudio.DISABLED;
		this.audioOnly = false;
		this._couldBacktrack = false;
		this._backtrackFragment = void 0;
		this.audioCodecSwitch = false;
		this.videoBuffer = null;
		this.onMediaPlaying = () => {
			this.tick();
		};
		this.onMediaSeeked = () => {
			const media = this.media;
			const currentTime = media ? media.currentTime : null;
			if (currentTime === null || !isFiniteNumber(currentTime)) return;
			this.log(`Media seeked to ${currentTime}`);
			if (!this.getBufferedFrag(currentTime)) return;
			const bufferInfo = this.getFwdBufferInfoAtPos(media, currentTime, PlaylistLevelType.MAIN, 0);
			if (!bufferInfo || bufferInfo.len === 0) {
				this.log(`Main buffer empty at ${currentTime} on "seeked" event: ${bufferInfo ? bufferInfo.len : bufferInfo}`);
				return;
			}
			this.tick();
		};
		this.registerListeners();
	}
	registerListeners() {
		super.registerListeners();
		const { hls } = this;
		hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
		hls.on(Events.LEVEL_LOADING, this.onLevelLoading, this);
		hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
		hls.on(Events.FRAG_LOAD_EMERGENCY_ABORTED, this.onFragLoadEmergencyAborted, this);
		hls.on(Events.AUDIO_TRACK_SWITCHING, this.onAudioTrackSwitching, this);
		hls.on(Events.AUDIO_TRACK_SWITCHED, this.onAudioTrackSwitched, this);
		hls.on(Events.BUFFER_CREATED, this.onBufferCreated, this);
		hls.on(Events.BUFFER_FLUSHED, this.onBufferFlushed, this);
		hls.on(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
		hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
	}
	unregisterListeners() {
		super.unregisterListeners();
		const { hls } = this;
		hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
		hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
		hls.off(Events.FRAG_LOAD_EMERGENCY_ABORTED, this.onFragLoadEmergencyAborted, this);
		hls.off(Events.AUDIO_TRACK_SWITCHING, this.onAudioTrackSwitching, this);
		hls.off(Events.AUDIO_TRACK_SWITCHED, this.onAudioTrackSwitched, this);
		hls.off(Events.BUFFER_CREATED, this.onBufferCreated, this);
		hls.off(Events.BUFFER_FLUSHED, this.onBufferFlushed, this);
		hls.off(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
		hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
	}
	onHandlerDestroying() {
		this.onMediaPlaying = this.onMediaSeeked = null;
		this.unregisterListeners();
		super.onHandlerDestroying();
	}
	startLoad(startPosition, skipSeekToStartPosition) {
		if (this.levels) {
			const { lastCurrentTime, hls } = this;
			this.stopLoad();
			this.setInterval(TICK_INTERVAL);
			this.level = -1;
			if (!this.startFragRequested) {
				let startLevel = hls.startLevel;
				if (startLevel === -1) {
					if (hls.config.testBandwidth && this.levels.length > 1) {
						startLevel = 0;
						this.bitrateTest = true;
					} else startLevel = hls.firstAutoLevel;
				}
				hls.nextLoadLevel = startLevel;
				this.level = hls.loadLevel;
				this._hasEnoughToStart = !!skipSeekToStartPosition;
			}
			if (lastCurrentTime > 0 && startPosition === -1 && !skipSeekToStartPosition && this.initPTS.length) {
				this.log(`Override startPosition with lastCurrentTime @${lastCurrentTime}`);
				startPosition = lastCurrentTime;
			}
			this.state = State.IDLE;
			this.nextLoadPosition = this.lastCurrentTime = startPosition + this.timelineOffset;
			this.startPosition = skipSeekToStartPosition ? -1 : startPosition;
			if (!skipSeekToStartPosition && !this.fragmentTracker.hasFragments(this.playlistType)) this._hasEnoughToStart = this.startFragRequested = false;
			this.tick();
		} else {
			this._forceStartLoad = true;
			this.state = State.STOPPED;
		}
	}
	stopLoad() {
		this._forceStartLoad = false;
		super.stopLoad();
	}
	doTick() {
		switch (this.state) {
			case State.WAITING_LEVEL: {
				const { levels, level } = this;
				const currentLevel = levels == null ? void 0 : levels[level];
				const details = currentLevel == null ? void 0 : currentLevel.details;
				if (details && (!details.live || this.levelLastLoaded === currentLevel && !this.waitForLive(currentLevel))) {
					if (this.waitForCdnTuneIn(details)) break;
					this.state = State.IDLE;
					break;
				} else if (this.hls.nextLoadLevel !== this.level) {
					this.state = State.IDLE;
					break;
				}
				break;
			}
			case State.FRAG_LOADING_WAITING_RETRY: this.checkRetryDate();
		}
		if (this.state === State.IDLE) this.doTickIdle();
		this.onTickEnd();
	}
	onTickEnd() {
		super.onTickEnd();
		this.checkFragmentChanged();
	}
	doTickIdle() {
		const { hls, levelLastLoaded, levels, media } = this;
		if (levelLastLoaded === null || !media && !this.primaryPrefetch && (this.startFragRequested || !hls.config.startFragPrefetch)) return;
		if (this.altAudio && this.audioOnly) return;
		const level = this.buffering ? hls.nextLoadLevel : hls.loadLevel;
		if (!(levels != null && levels[level])) return;
		const levelInfo = levels[level];
		const bufferInfo = this.getMainFwdBufferInfo();
		if (bufferInfo === null) return;
		const lastDetails = this.getLevelDetails();
		if (lastDetails && this._streamEnded(bufferInfo, lastDetails) && this.altAudio !== AlternateAudio.SWITCHING) {
			const data = { type: this.targetBufferType() };
			this.hls.trigger(Events.BUFFER_EOS, data);
			this.state = State.ENDED;
			return;
		}
		if (!this.buffering) return;
		if (hls.loadLevel !== level && hls.manualLevel === -1) this.log(`Adapting to level ${level} from level ${this.level}`);
		this.level = hls.nextLoadLevel = level;
		const levelDetails = levelInfo.details;
		if (!levelDetails || this.state === State.WAITING_LEVEL || this.waitForLive(levelInfo)) {
			this.level = level;
			this.state = State.WAITING_LEVEL;
			this.startFragRequested = false;
			return;
		}
		const bufferLen = bufferInfo.len;
		const maxBufLen = this.getMaxBufferLength(levelInfo.maxBitrate);
		if (bufferLen >= maxBufLen) return;
		if (this.backtrackFragment && this.backtrackFragment.start > bufferInfo.end) this.backtrackFragment = void 0;
		const targetBufferTime = this.backtrackFragment ? this.backtrackFragment.start : bufferInfo.end;
		let frag = this.getNextFragment(targetBufferTime, levelDetails);
		if (this.couldBacktrack && !this.fragPrevious && frag && isMediaFragment(frag) && this.fragmentTracker.getState(frag) !== FragmentState.OK) {
			var _this$backtrackFragme;
			const fragIdx = ((_this$backtrackFragme = this.backtrackFragment) != null ? _this$backtrackFragme : frag).sn - levelDetails.startSN;
			const backtrackFrag = levelDetails.fragments[fragIdx - 1];
			if (backtrackFrag && frag.cc === backtrackFrag.cc) {
				frag = backtrackFrag;
				this.fragmentTracker.removeFragment(backtrackFrag);
			}
		} else if (this.backtrackFragment && bufferInfo.len) this.backtrackFragment = void 0;
		if (frag && this.isLoopLoading(frag, targetBufferTime)) {
			if (!frag.gap) {
				const type = this.audioOnly && !this.altAudio ? ElementaryStreamTypes.AUDIO : ElementaryStreamTypes.VIDEO;
				const mediaBuffer = (type === ElementaryStreamTypes.VIDEO ? this.videoBuffer : this.mediaBuffer) || this.media;
				if (mediaBuffer) this.afterBufferFlushed(mediaBuffer, type);
			}
			frag = this.getNextFragmentLoopLoading(frag, levelDetails, bufferInfo, PlaylistLevelType.MAIN, maxBufLen);
		}
		if (!frag) return;
		if (this.exceedsMaxBuffer(bufferInfo, maxBufLen, frag)) return;
		this.loadFragment(frag, levelInfo, targetBufferTime);
	}
	loadFragment(frag, level, targetBufferTime) {
		const fragState = this.fragmentTracker.getState(frag);
		if (fragState === FragmentState.NOT_LOADED || fragState === FragmentState.PARTIAL) {
			if (this.bitrateTest) {
				this.log(`Fragment ${frag.sn} of level ${frag.level} is being downloaded to test bitrate and will not be buffered`);
				this._loadBitrateTestFrag(frag, level);
			} else super.loadFragment(frag, level, targetBufferTime);
		} else this.clearTrackerIfNeeded(frag);
	}
	immediateLevelSwitch() {
		this.abortCurrentFrag();
		this.flushMainBuffer(0, Number.POSITIVE_INFINITY);
		if (this.altAudio !== AlternateAudio.DISABLED) {
			var _this$getLevelDetails;
			if ((((_this$getLevelDetails = this.getLevelDetails()) == null ? void 0 : _this$getLevelDetails.fragmentStart) || 0) > this.lastCurrentTime) super.flushMainBuffer(0, Number.POSITIVE_INFINITY, "audio");
		}
	}
	/**
	* Get the buffer output to use for buffer calculations.
	* Override to use altAudio logic in stream-controller.
	*/
	getBufferOutput() {
		if (this.mediaBuffer && this.altAudio === AlternateAudio.SWITCHED) return this.mediaBuffer;
		return this.media;
	}
	checkFragmentChanged() {
		const previousFrag = this.fragPlaying;
		if (!this.checkFragPlaying()) return false;
		const fragPlaying = this.fragPlaying;
		if (fragPlaying) {
			const fragCurrentLevel = fragPlaying.level;
			this.hls.trigger(Events.FRAG_CHANGED, {
				frag: fragPlaying,
				previousFrag
			});
			if ((previousFrag == null ? void 0 : previousFrag.level) !== fragCurrentLevel) this.hls.trigger(Events.LEVEL_SWITCHED, { level: fragCurrentLevel });
		}
		return true;
	}
	/**
	* Get backtrack fragment. Override to return actual backtrack fragment.
	*/
	get backtrackFragment() {
		return this._backtrackFragment;
	}
	/**
	* Set backtrack fragment. Override to set actual backtrack fragment.
	*/
	set backtrackFragment(value) {
		this._backtrackFragment = value;
	}
	/**
	* Get could backtrack flag. Override to return actual value.
	*/
	get couldBacktrack() {
		return this._couldBacktrack;
	}
	/**
	* Set could backtrack flag. Override to set actual value.
	*/
	set couldBacktrack(value) {
		this._couldBacktrack = value;
	}
	abortCurrentFrag() {
		this.backtrackFragment = void 0;
		super.abortCurrentFrag();
	}
	flushMainBuffer(startOffset, endOffset) {
		super.flushMainBuffer(startOffset, endOffset, this.targetBufferType());
	}
	targetBufferType() {
		return this.altAudio === AlternateAudio.SWITCHED && !this.audioOnly ? "video" : null;
	}
	onMediaAttached(event, data) {
		super.onMediaAttached(event, data);
		const media = data.media;
		addEventListener(media, "playing", this.onMediaPlaying);
		addEventListener(media, "seeked", this.onMediaSeeked);
	}
	onMediaDetaching(event, data) {
		const { media } = this;
		if (media) {
			removeEventListener(media, "playing", this.onMediaPlaying);
			removeEventListener(media, "seeked", this.onMediaSeeked);
		}
		this.videoBuffer = null;
		super.onMediaDetaching(event, data);
		if (!!data.transferMedia) return;
		this._hasEnoughToStart = false;
	}
	onManifestLoading() {
		super.onManifestLoading();
		this.log("Trigger BUFFER_RESET");
		this.hls.trigger(Events.BUFFER_RESET, void 0);
		this.couldBacktrack = false;
		this.backtrackFragment = void 0;
		this.altAudio = AlternateAudio.DISABLED;
		this.audioOnly = false;
	}
	onManifestParsed(event, data) {
		let aac = false;
		let heaac = false;
		for (let i = 0; i < data.levels.length; i++) {
			const codec = data.levels[i].audioCodec;
			if (codec) {
				aac = aac || codec.indexOf("mp4a.40.2") !== -1;
				heaac = heaac || codec.indexOf("mp4a.40.5") !== -1;
			}
		}
		this.audioCodecSwitch = aac && heaac && !changeTypeSupported();
		if (this.audioCodecSwitch) this.log("Both AAC/HE-AAC audio found in levels; declaring level codec as HE-AAC");
		this.levels = data.levels;
		this.startFragRequested = false;
	}
	onLevelLoading(event, data) {
		const { levels } = this;
		if (!levels || this.state !== State.IDLE) return;
		const level = data.levelInfo;
		if (!level.details || level.details.live && (this.levelLastLoaded !== level || level.details.expired) || this.waitForCdnTuneIn(level.details)) this.state = State.WAITING_LEVEL;
	}
	onLevelLoaded(event, data) {
		var _curLevel$details;
		const { levels, startFragRequested } = this;
		const newLevelId = data.level;
		const newDetails = data.details;
		const duration = newDetails.totalduration;
		if (!levels) {
			this.warn(`Levels were reset while loading level ${newLevelId}`);
			return;
		}
		this.log(`Level ${newLevelId} loaded [${newDetails.startSN},${newDetails.endSN}]${newDetails.lastPartSn ? `[part-${newDetails.lastPartSn}-${newDetails.lastPartIndex}]` : ""}, cc [${newDetails.startCC}, ${newDetails.endCC}] duration:${duration}`);
		const curLevel = data.levelInfo;
		const fragCurrent = this.fragCurrent;
		if (fragCurrent && (this.state === State.FRAG_LOADING || this.state === State.FRAG_LOADING_WAITING_RETRY)) {
			if (fragCurrent.level !== data.level && fragCurrent.loader) this.abortCurrentFrag();
		}
		let sliding = 0;
		if (newDetails.live || (_curLevel$details = curLevel.details) != null && _curLevel$details.live) {
			var _this$levelLastLoaded;
			this.checkLiveUpdate(newDetails);
			if (newDetails.deltaUpdateFailed) return;
			sliding = this.alignPlaylists(newDetails, curLevel.details, (_this$levelLastLoaded = this.levelLastLoaded) == null ? void 0 : _this$levelLastLoaded.details);
		}
		curLevel.details = newDetails;
		this.levelLastLoaded = curLevel;
		if (!startFragRequested) this.setStartPosition(newDetails, sliding);
		this.hls.trigger(Events.LEVEL_UPDATED, {
			details: newDetails,
			level: newLevelId
		});
		if (this.state === State.WAITING_LEVEL) {
			if (this.waitForCdnTuneIn(newDetails)) return;
			this.state = State.IDLE;
		}
		if (startFragRequested && newDetails.live) this.synchronizeToLiveEdge(newDetails);
		this.initPTS.some((t, i) => {
			if (i >= newDetails.startCC) return true;
			delete this.initPTS[i];
		});
		this.tick();
	}
	synchronizeToLiveEdge(levelDetails) {
		const { config, media } = this;
		if (!media) return;
		const liveSyncPosition = this.hls.liveSyncPosition;
		const currentTime = this.playhead;
		const start = levelDetails.fragmentStart;
		const end = levelDetails.edge;
		const withinSlidingWindow = currentTime >= start - config.maxFragLookUpTolerance && currentTime <= end;
		if (liveSyncPosition !== null && media.duration > liveSyncPosition && (currentTime < liveSyncPosition || !withinSlidingWindow)) {
			const maxLatency = config.liveMaxLatencyDuration !== void 0 ? config.liveMaxLatencyDuration : config.liveMaxLatencyDurationCount * levelDetails.targetduration;
			if (!withinSlidingWindow && media.readyState < 4 || currentTime < end - maxLatency) {
				if (!this._hasEnoughToStart) this.nextLoadPosition = liveSyncPosition;
				if (media.readyState) {
					this.warn(`Playback: ${currentTime} is located too far from the end of live sliding playlist: ${end}, reset currentTime to : ${liveSyncPosition}`);
					if (this.config.liveSyncMode === "buffered") {
						var _bufferInfo$buffered;
						const bufferInfo = BufferHelper.bufferInfo(media, liveSyncPosition, 0);
						if (!((_bufferInfo$buffered = bufferInfo.buffered) != null && _bufferInfo$buffered.length)) {
							media.currentTime = liveSyncPosition;
							return;
						}
						if (bufferInfo.start <= currentTime) {
							media.currentTime = liveSyncPosition;
							return;
						}
						const { nextStart } = BufferHelper.bufferedInfo(bufferInfo.buffered, currentTime, 0);
						if (nextStart) media.currentTime = nextStart;
					} else media.currentTime = liveSyncPosition;
				}
			}
		}
	}
	_handleFragmentLoadProgress(data) {
		var _frag$initSegment;
		const frag = data.frag;
		const { part, payload } = data;
		const { levels } = this;
		if (!levels) {
			this.warn(`Levels were reset while fragment load was in progress. Fragment ${frag.sn} of level ${frag.level} will not be buffered`);
			return;
		}
		const currentLevel = levels[frag.level];
		if (!currentLevel) {
			this.warn(`Level ${frag.level} not found on progress`);
			return;
		}
		const details = currentLevel.details;
		if (!details) {
			this.warn(`Dropping fragment ${frag.sn} of level ${frag.level} after level details were reset`);
			this.fragmentTracker.removeFragment(frag);
			return;
		}
		const videoCodec = currentLevel.videoCodec;
		const accurateTimeOffset = details.PTSKnown || !details.live;
		const initSegmentData = (_frag$initSegment = frag.initSegment) == null ? void 0 : _frag$initSegment.data;
		const audioCodec = this._getAudioCodec(currentLevel);
		const transmuxer = this.transmuxer = this.transmuxer || new TransmuxerInterface(this.hls, PlaylistLevelType.MAIN, this._handleTransmuxComplete.bind(this), this._handleTransmuxerFlush.bind(this));
		const partIndex = part ? part.index : -1;
		const partial = partIndex !== -1;
		const { decryptRange, byteRange } = getAESAdjustments(frag, part, this.iframesOnly);
		const chunkMeta = new ChunkMetadata(frag.level, frag.sn, frag.stats.chunkCount, byteRange ? byteRange.end - byteRange.start : payload.byteLength, partIndex, partial, frag.duration, this.iframesOnly, decryptRange);
		const initPTS = this.initPTS[frag.cc];
		transmuxer.push(payload, initSegmentData, audioCodec, videoCodec, frag, part, details.totalduration, accurateTimeOffset, chunkMeta, initPTS);
	}
	onAudioTrackSwitching(event, data) {
		const hls = this.hls;
		const fromAltAudio = this.altAudio !== AlternateAudio.DISABLED;
		if (!useAlternateAudio(data.url, hls)) {
			if (this.mediaBuffer !== this.media) {
				this.log("Switching on main audio, use media.buffered to schedule main fragment loading");
				this.mediaBuffer = this.media;
				const fragCurrent = this.fragCurrent;
				if (fragCurrent) {
					this.log("Switching to main audio track, cancel main fragment load");
					fragCurrent.abortRequests();
					this.fragmentTracker.removeFragment(fragCurrent);
				}
				this.resetTransmuxer();
				this.resetLoadingState();
			} else if (this.audioOnly) this.resetTransmuxer();
			if (fromAltAudio) {
				this.altAudio = AlternateAudio.DISABLED;
				this.fragmentTracker.removeAllFragments();
				hls.once(Events.BUFFER_FLUSHED, () => {
					if (!this.hls) return;
					this.hls.trigger(Events.AUDIO_TRACK_SWITCHED, data);
				});
				hls.trigger(Events.BUFFER_FLUSHING, {
					startOffset: 0,
					endOffset: Number.POSITIVE_INFINITY,
					type: null
				});
				return;
			}
			hls.trigger(Events.AUDIO_TRACK_SWITCHED, data);
		} else this.altAudio = AlternateAudio.SWITCHING;
	}
	onAudioTrackSwitched(event, data) {
		const altAudio = useAlternateAudio(data.url, this.hls);
		if (altAudio) {
			const videoBuffer = this.videoBuffer;
			if (videoBuffer && this.mediaBuffer !== videoBuffer) {
				this.log("Switching on alternate audio, use video.buffered to schedule main fragment loading");
				this.mediaBuffer = videoBuffer;
			}
		}
		this.altAudio = altAudio ? AlternateAudio.SWITCHED : AlternateAudio.DISABLED;
		this.tick();
	}
	onBufferCreated(event, data) {
		const tracks = data.tracks;
		let mediaTrack;
		let name;
		let alternate = false;
		for (const type in tracks) {
			const track = tracks[type];
			if (track.id === "main") {
				name = type;
				mediaTrack = track;
				if (type === "video") {
					const videoTrack = tracks[type];
					if (videoTrack) this.videoBuffer = videoTrack.buffer;
				}
			} else alternate = true;
		}
		if (alternate && mediaTrack) {
			this.log(`Alternate track found, use ${name}.buffered to schedule main fragment loading`);
			this.mediaBuffer = mediaTrack.buffer;
		} else this.mediaBuffer = this.media;
	}
	onFragBuffered(event, data) {
		const { frag, part } = data;
		const bufferedMainFragment = frag.type === PlaylistLevelType.MAIN;
		if (bufferedMainFragment) {
			if (this.fragContextChanged(frag)) {
				this.warn(`Fragment ${frag.sn}${part ? " p: " + part.index : ""} of level ${frag.level} finished buffering, but was aborted. state: ${this.state}`);
				if (this.state === State.PARSED) this.state = State.IDLE;
				return;
			}
			let fragError = false;
			if (isMediaFragment(frag)) fragError = !!frag.gap && !frag.tagList.some((tags) => tags[0] === "GAP");
			this.fragBufferedComplete(frag, part);
			if (fragError) {
				var _this$levels;
				frag.stats.retry++;
				const level = (_this$levels = this.levels) == null ? void 0 : _this$levels[frag.level];
				if (level) level.fragmentError++;
			}
		}
		const media = this.media;
		if (!media) return;
		if (!this._hasEnoughToStart && BufferHelper.getBuffered(media).length) {
			this.seekToStartPos();
			this._hasEnoughToStart = true;
		}
		if (bufferedMainFragment) this.tick();
	}
	get hasEnoughToStart() {
		return this._hasEnoughToStart;
	}
	onError(event, data) {
		var _data$context;
		if (data.fatal) {
			this.state = State.ERROR;
			return;
		}
		switch (data.details) {
			case ErrorDetails.FRAG_GAP:
			case ErrorDetails.FRAG_PARSING_ERROR:
			case ErrorDetails.FRAG_DECRYPT_ERROR:
			case ErrorDetails.FRAG_LOAD_ERROR:
			case ErrorDetails.FRAG_LOAD_TIMEOUT:
			case ErrorDetails.KEY_LOAD_ERROR:
			case ErrorDetails.KEY_LOAD_TIMEOUT:
				this.onFragmentOrKeyLoadError(PlaylistLevelType.MAIN, data);
				break;
			case ErrorDetails.LEVEL_LOAD_ERROR:
			case ErrorDetails.LEVEL_LOAD_TIMEOUT:
			case ErrorDetails.LEVEL_PARSING_ERROR:
				if (!data.levelRetry && this.state === State.WAITING_LEVEL && ((_data$context = data.context) == null ? void 0 : _data$context.type) === LoaderContextType.LEVEL) this.state = State.IDLE;
				break;
			case ErrorDetails.BUFFER_APPEND_NO_PROGRESS:
				if (data.parent !== "main") return;
				if (data.frag && (data.appendsWithoutProgress || 0) >= this.config.appendErrorMaxRetry) {
					this.warn(`Marking fragment ${data.frag.sn} of level ${data.frag.level} as a gap after ${data.appendsWithoutProgress} appends without buffered range growth, to prevent loop loading`);
					this.fragmentTracker.addAsGap(data.frag);
				}
				break;
			case ErrorDetails.MEDIA_SOURCE_REQUIRES_RESET:
				this.onSourceBufferError(PlaylistLevelType.MAIN, data);
				break;
			case ErrorDetails.BUFFER_ADD_CODEC_ERROR:
			case ErrorDetails.BUFFER_APPEND_ERROR:
				if (data.parent !== "main") return;
				if (this.reduceLengthAndFlushBuffer(data)) this.resetLoadingState();
				break;
			case ErrorDetails.BUFFER_FULL_ERROR:
				if (data.parent !== "main") return;
				if (this.reduceLengthAndFlushBuffer(data)) {
					if (!this.config.interstitialsController && this.config.assetPlayerId) this._hasEnoughToStart = true;
					else this.flushMainBuffer(0, Number.POSITIVE_INFINITY);
				}
				break;
			case ErrorDetails.INTERNAL_EXCEPTION: this.recoverWorkerError(data);
		}
	}
	onFragLoadEmergencyAborted() {
		this.state = State.IDLE;
		if (!this._hasEnoughToStart) {
			this.startFragRequested = false;
			this.nextLoadPosition = this.lastCurrentTime;
		}
		this.tickImmediate();
	}
	onBufferFlushed(event, { type }) {
		if (type !== ElementaryStreamTypes.AUDIO || !this.altAudio) {
			const mediaBuffer = (type === ElementaryStreamTypes.VIDEO ? this.videoBuffer : this.mediaBuffer) || this.media;
			if (mediaBuffer) {
				this.afterBufferFlushed(mediaBuffer, type);
				this.tick();
			}
		}
	}
	onLevelsUpdated(event, data) {
		if (this.level > -1 && this.fragCurrent) {
			this.level = this.fragCurrent.level;
			if (this.level === -1) this.resetWhenMissingContext(this.fragCurrent);
		}
		this.levels = data.levels;
	}
	swapAudioCodec() {
		this.audioCodecSwap = !this.audioCodecSwap;
	}
	/**
	* Seeks to the set startPosition if not equal to the mediaElement's current time.
	*/
	seekToStartPos() {
		const { media } = this;
		if (!media) return;
		const currentTime = media.currentTime;
		let startPosition = this.startPosition;
		if (startPosition >= 0 && currentTime < startPosition) {
			if (media.seeking) {
				this.log(`could not seek to ${startPosition}, already seeking at ${currentTime}`);
				return;
			}
			const timelineOffset = this.timelineOffset;
			if (timelineOffset && startPosition) startPosition += timelineOffset;
			const details = this.getLevelDetails();
			const buffered = BufferHelper.getBuffered(media);
			const bufferStart = buffered.length ? buffered.start(0) : 0;
			const delta = bufferStart - startPosition;
			const skipTolerance = Math.max(this.config.maxBufferHole, this.config.maxFragLookUpTolerance);
			if (this.config.startOnSegmentBoundary || delta > 0 && (delta < skipTolerance || this.loadingParts && delta < 2 * ((details == null ? void 0 : details.partTarget) || 0))) {
				this.log(`adjusting start position by ${delta} to match buffer start`);
				startPosition += delta;
				this.startPosition = startPosition;
			}
			if (currentTime < startPosition) {
				this.log(`seek to target start position ${startPosition} from current time ${currentTime} buffer start ${bufferStart}`);
				media.currentTime = startPosition;
			}
		}
	}
	_getAudioCodec(currentLevel) {
		let audioCodec = this.config.defaultAudioCodec || currentLevel.audioCodec;
		if (this.audioCodecSwap && audioCodec) {
			this.log("Swapping audio codec");
			if (audioCodec.indexOf("mp4a.40.5") !== -1) audioCodec = "mp4a.40.2";
			else audioCodec = "mp4a.40.5";
		}
		return audioCodec;
	}
	_loadBitrateTestFrag(fragment, level) {
		fragment.bitrateTest = true;
		this._doFragLoad(fragment, level).then((data) => {
			const { hls } = this;
			const frag = data == null ? void 0 : data.frag;
			if (!frag || this.fragContextChanged(frag)) return;
			level.fragmentError = 0;
			this.state = State.IDLE;
			this.startFragRequested = false;
			this.bitrateTest = false;
			const stats = frag.stats;
			stats.parsing.start = stats.parsing.end = stats.buffering.start = stats.buffering.end = self.performance.now();
			hls.trigger(Events.FRAG_LOADED, data);
			frag.bitrateTest = false;
		}).catch((reason) => {
			if (this.state === State.STOPPED || this.state === State.ERROR) return;
			this.warn(reason);
			this.resetFragmentLoading(fragment);
		});
	}
	_handleTransmuxComplete(transmuxResult) {
		const id = this.playlistType;
		const { hls } = this;
		const { remuxResult, chunkMeta } = transmuxResult;
		const context = this.getCurrentContext(chunkMeta);
		if (!context) {
			this.resetWhenMissingContext(chunkMeta);
			return;
		}
		const { frag, part, level } = context;
		const { video, text, id3, initSegment } = remuxResult;
		const { details } = level;
		const audio = this.altAudio ? void 0 : remuxResult.audio;
		if (this.fragContextChanged(frag)) {
			this.fragmentTracker.removeFragment(frag);
			return;
		}
		this.state = State.PARSING;
		if (initSegment) {
			const tracks = initSegment.tracks;
			if (tracks) {
				const mapFragment = frag.initSegment || frag;
				if (this.unhandledEncryptionError(initSegment, frag)) return;
				this._bufferInitSegment(level, tracks, mapFragment, chunkMeta);
				hls.trigger(Events.FRAG_PARSING_INIT_SEGMENT, {
					frag: mapFragment,
					id,
					tracks
				});
			}
			const baseTime = initSegment.initPTS;
			const timescale = initSegment.timescale;
			const initPTS = this.initPTS[frag.cc];
			if (isFiniteNumber(baseTime) && (!initPTS || initPTS.baseTime !== baseTime || initPTS.timescale !== timescale)) {
				const trackId = initSegment.trackId;
				this.initPTS[frag.cc] = {
					baseTime,
					timescale,
					trackId
				};
				const timestampOffsets = this.initPTS.slice(0);
				hls.trigger(Events.INIT_PTS_FOUND, {
					timestampOffsets,
					frag,
					id,
					initPTS: baseTime,
					timescale,
					trackId
				});
			}
		}
		if (video && details) {
			if (audio && video.type === "audiovideo") this.logMuxedErr(frag);
			const prevFrag = details.fragments[frag.sn - 1 - details.startSN];
			const isFirstFragment = frag.sn === details.startSN;
			const isFirstInDiscontinuity = !prevFrag || frag.cc > prevFrag.cc;
			if (remuxResult.independent !== false) {
				const { startPTS, endPTS, startDTS, endDTS } = video;
				if (part) part.elementaryStreams[video.type] = {
					startPTS,
					endPTS,
					startDTS,
					endDTS
				};
				else {
					if (video.firstKeyFrame && video.independent && chunkMeta.id === 1 && !isFirstInDiscontinuity) this.couldBacktrack = true;
					if (video.dropped && video.independent) {
						const bufferInfo = this.getMainFwdBufferInfo();
						const targetBufferTime = (bufferInfo ? bufferInfo.end : this.getLoadPosition()) + this.config.maxBufferHole;
						const startTime = video.firstKeyFramePTS ? video.firstKeyFramePTS : startPTS;
						if (!isFirstFragment && targetBufferTime < startTime - this.config.maxBufferHole && !isFirstInDiscontinuity) {
							this.backtrack(frag);
							return;
						} else if (isFirstInDiscontinuity) frag.gap = true;
						frag.setElementaryStreamInfo(video.type, frag.start, endPTS, frag.start, endDTS, true);
					} else if (isFirstFragment && startPTS - (details.appliedTimelineOffset || 0) > MAX_START_GAP_JUMP) frag.gap = true;
				}
				frag.setElementaryStreamInfo(video.type, startPTS, endPTS, startDTS, endDTS);
				if (this.backtrackFragment) this.backtrackFragment = frag;
				this.bufferFragmentData(video, frag, part, chunkMeta, isFirstFragment || isFirstInDiscontinuity);
			} else if (isFirstFragment || isFirstInDiscontinuity) frag.gap = true;
			else {
				this.backtrack(frag);
				return;
			}
		}
		if (audio) {
			const { startPTS, endPTS, startDTS, endDTS } = audio;
			if (part) part.elementaryStreams[ElementaryStreamTypes.AUDIO] = {
				startPTS,
				endPTS,
				startDTS,
				endDTS
			};
			frag.setElementaryStreamInfo(ElementaryStreamTypes.AUDIO, startPTS, endPTS, startDTS, endDTS);
			this.bufferFragmentData(audio, frag, part, chunkMeta);
		}
		if (details && id3 != null && id3.samples.length) {
			const emittedID3 = {
				id,
				frag,
				details,
				samples: id3.samples
			};
			hls.trigger(Events.FRAG_PARSING_METADATA, emittedID3);
		}
		if (details && text) {
			const emittedText = {
				id,
				frag,
				details,
				samples: text.samples
			};
			hls.trigger(Events.FRAG_PARSING_USERDATA, emittedText);
		}
	}
	logMuxedErr(frag) {
		this.warn(`${isMediaFragment(frag) ? "Media" : "Init"} segment with muxed audiovideo where only video expected: ${frag.url}`);
	}
	_bufferInitSegment(currentLevel, tracks, frag, chunkMeta) {
		if (this.state !== State.PARSING) return;
		this.audioOnly = !!tracks.audio && !tracks.video;
		if (this.altAudio && !this.audioOnly) {
			delete tracks.audio;
			if (tracks.audiovideo) this.logMuxedErr(frag);
		}
		const { audio, video, audiovideo } = tracks;
		if (audio) {
			const levelCodec = currentLevel.audioCodec;
			let audioCodec = pickMostCompleteCodecName(audio.codec, levelCodec);
			if (audioCodec === "mp4a") audioCodec = "mp4a.40.5";
			if (this.audioCodecSwitch) {
				if (audioCodec) {
					if (audioCodec.indexOf("mp4a.40.5") !== -1) audioCodec = "mp4a.40.2";
					else audioCodec = "mp4a.40.5";
				}
				const audioMetadata = audio.metadata;
				if (audioMetadata && "channelCount" in audioMetadata && (audioMetadata.channelCount || 1) !== 1 && !userAgentFirefoxVersion()) audioCodec = "mp4a.40.5";
			}
			if (audioCodec && audioCodec.indexOf("mp4a.40.5") !== -1 && userAgentIsAndroidLike() && audio.container !== "audio/mpeg") {
				audioCodec = "mp4a.40.2";
				this.log(`Android: force audio codec to ${audioCodec}`);
			}
			if (levelCodec && levelCodec !== audioCodec) this.log(`Swapping manifest audio codec "${levelCodec}" for "${audioCodec}"`);
			audio.levelCodec = audioCodec;
			audio.id = PlaylistLevelType.MAIN;
			this.log(`Init audio buffer, container:${audio.container}, codecs[selected/level/parsed]=[${audioCodec || ""}/${levelCodec || ""}/${audio.codec}]`);
			delete tracks.audiovideo;
		}
		if (video) {
			video.levelCodec = currentLevel.videoCodec;
			video.id = PlaylistLevelType.MAIN;
			const parsedVideoCodec = video.codec;
			if ((parsedVideoCodec == null ? void 0 : parsedVideoCodec.length) === 4) switch (parsedVideoCodec) {
				case "hvc1":
				case "hev1":
					video.codec = "hvc1.1.6.L120.90";
					break;
				case "av01":
					video.codec = "av01.0.04M.08";
					break;
				case "avc1": video.codec = "avc1.42e01e";
			}
			this.log(`Init video buffer, container:${video.container}, codecs[level/parsed]=[${currentLevel.videoCodec || ""}/${parsedVideoCodec}]${video.codec !== parsedVideoCodec ? " parsed-corrected=" + video.codec : ""}${video.supplemental ? " supplemental=" + video.supplemental : ""}`);
			delete tracks.audiovideo;
		}
		if (audiovideo) {
			if (this.iframesOnly) this.logMuxedErr(frag);
			this.log(`Init audiovideo buffer, container:${audiovideo.container}, codecs[level/parsed]=[${currentLevel.codecs}/${audiovideo.codec}]`);
			delete tracks.video;
			delete tracks.audio;
		}
		const trackTypes = Object.keys(tracks);
		if (trackTypes.length) {
			this.hls.trigger(Events.BUFFER_CODECS, tracks);
			if (!this.hls) return;
			trackTypes.forEach((trackName) => {
				const initSegment = tracks[trackName].initSegment;
				if (initSegment != null && initSegment.byteLength) this.hls.trigger(Events.BUFFER_APPENDING, {
					type: trackName,
					data: initSegment,
					frag,
					part: null,
					chunkMeta,
					parent: frag.type
				});
			});
		}
		this.tickImmediate();
	}
	getMainFwdBufferInfo() {
		const bufferOutput = this.getBufferOutput();
		return this.getFwdBufferInfo(bufferOutput, PlaylistLevelType.MAIN);
	}
	get maxBufferLength() {
		const { levels, level } = this;
		const levelInfo = levels == null ? void 0 : levels[level];
		if (!levelInfo) return this.config.maxBufferLength;
		return this.getMaxBufferLength(levelInfo.maxBitrate);
	}
	backtrack(frag) {
		this.couldBacktrack = true;
		this.backtrackFragment = frag;
		this.resetTransmuxer();
		this.flushBufferGap(frag);
		this.fragmentTracker.removeFragment(frag);
		this.fragPrevious = null;
		this.nextLoadPosition = frag.start;
		this.state = State.IDLE;
	}
	get nextLevel() {
		const frag = this.nextBufferedFrag;
		if (frag) return frag.level;
		return -1;
	}
	get currentFrag() {
		var _this$media;
		if (this.fragPlaying) return this.fragPlaying;
		const currentTime = ((_this$media = this.media) == null ? void 0 : _this$media.currentTime) || this.lastCurrentTime;
		if (isFiniteNumber(currentTime)) return this.getAppendedFrag(currentTime);
		return null;
	}
	get currentProgramDateTime() {
		var _this$media2;
		const currentTime = ((_this$media2 = this.media) == null ? void 0 : _this$media2.currentTime) || this.lastCurrentTime;
		if (isFiniteNumber(currentTime)) {
			const details = this.getLevelDetails();
			const frag = this.currentFrag || (details ? findFragmentByPTS(null, details.fragments, currentTime) : null);
			if (frag) {
				const programDateTime = frag.programDateTime;
				if (programDateTime !== null) {
					const epocMs = programDateTime + (currentTime - frag.start) * 1e3;
					return new Date(epocMs);
				}
			}
		}
		return null;
	}
	get currentLevel() {
		const frag = this.currentFrag;
		if (frag) return frag.level;
		return -1;
	}
	get nextBufferedFrag() {
		const frag = this.currentFrag;
		if (frag) return this.followingBufferedFrag(frag);
		return null;
	}
	get forceStartLoad() {
		return this._forceStartLoad;
	}
};
var BaseLoader = class {
	constructor() {
		this.requestTimeout = void 0;
		this.retryTimeout = void 0;
		this.retryDelay = 0;
		this.config = null;
		this.callbacks = null;
		this.context = null;
		this.stats = new LoadStats();
	}
	destroy() {
		this.callbacks = this.context = this.config = null;
		this.abortInternal();
		this.stats = null;
	}
	load(context, config, callbacks) {
		const stats = this.stats;
		if (stats.loading.start) throw new Error("Loader can only be used once.");
		stats.loading.start = self.performance.now();
		this.context = context;
		this.config = config;
		this.callbacks = callbacks;
		this.loadInternal();
	}
	abort() {
		var _this$callbacks;
		this.abortInternal();
		if ((_this$callbacks = this.callbacks) != null && _this$callbacks.onAbort) this.callbacks.onAbort(this.stats, this.context, this.getNetworkDetails());
	}
	loadtimeout() {
		if (!this.config) return;
		const retryConfig = this.config.loadPolicy.timeoutRetry;
		const retryCount = this.stats.retry;
		if (shouldRetry(retryConfig, retryCount, true)) this.retry(retryConfig);
		else {
			var _this$context;
			logger.warn(`timeout while loading ${(_this$context = this.context) == null ? void 0 : _this$context.url}`);
			const callbacks = this.callbacks;
			if (callbacks) {
				this.abortInternal();
				callbacks.onTimeout(this.stats, this.context, this.getNetworkDetails());
			}
		}
	}
	retry(retryConfig) {
		const { context, stats } = this;
		this.retryDelay = getRetryDelay(retryConfig, stats.retry);
		stats.retry++;
		logger.warn(`${status ? "HTTP Status " + status : "Timeout"} while loading ${context == null ? void 0 : context.url}, retrying ${stats.retry}/${retryConfig.maxNumRetry} in ${this.retryDelay}ms`);
		this.abortInternal();
		this.resetInternalLoader();
		self.clearTimeout(this.retryTimeout);
		this.retryTimeout = self.setTimeout(() => this.loadInternal(), this.retryDelay);
	}
};
var ChunkCache = class {
	constructor() {
		this.chunks = [];
		this.dataLength = 0;
	}
	push(chunk) {
		this.chunks.push(chunk);
		this.dataLength += chunk.length;
	}
	flush() {
		const { chunks, dataLength } = this;
		let result;
		if (!chunks.length) return /* @__PURE__ */ new Uint8Array(0);
		else if (chunks.length === 1) result = chunks[0];
		else result = concatUint8Arrays(chunks, dataLength);
		this.reset();
		return result;
	}
	reset() {
		this.chunks.length = 0;
		this.dataLength = 0;
	}
};
function concatUint8Arrays(chunks, dataLength) {
	const result = new Uint8Array(dataLength);
	let offset = 0;
	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		result.set(chunk, offset);
		offset += chunk.length;
	}
	return result;
}
function fetchSupported() {
	if (self.fetch && self.AbortController && self.ReadableStream && self.Request) try {
		new self.ReadableStream({});
		return true;
	} catch (e) {}
	return false;
}
var BYTERANGE = /(\d+)-(\d+)\/(\d+)/;
var FetchLoader = class extends BaseLoader {
	constructor(config) {
		super();
		this.fetchSetup = void 0;
		this.request = null;
		this.response = null;
		this.controller = null;
		this.fetchSetup = config.fetchSetup || getRequest;
	}
	destroy() {
		this.request = null;
		super.destroy();
		this.response = null;
		this.controller = null;
		this.fetchSetup = null;
	}
	abortInternal() {
		self.clearTimeout(this.retryTimeout);
		if (this.controller && !this.stats.loading.end) {
			this.stats.aborted = true;
			this.controller.abort();
		}
	}
	getNetworkDetails() {
		return this.response;
	}
	resetInternalLoader() {
		this.response = null;
	}
	loadInternal() {
		const { config, context, stats } = this;
		if (!config || !context) return;
		stats.loading.first = 0;
		stats.loaded = 0;
		stats.aborted = false;
		this.controller = new self.AbortController();
		const initParams = getRequestParameters(context, this.controller.signal);
		const isArrayBuffer = context.responseType === "arraybuffer";
		const LENGTH = isArrayBuffer ? "byteLength" : "length";
		const { maxTimeToFirstByteMs, maxLoadTimeMs } = config.loadPolicy;
		this.request = this.fetchSetup(context, initParams);
		self.clearTimeout(this.requestTimeout);
		config.timeout = maxTimeToFirstByteMs && isFiniteNumber(maxTimeToFirstByteMs) ? maxTimeToFirstByteMs : maxLoadTimeMs;
		this.requestTimeout = self.setTimeout(() => {
			this.loadtimeout();
		}, config.timeout);
		(isPromise(this.request) ? this.request.then(self.fetch) : self.fetch(this.request)).then((response) => {
			var _this$callbacks;
			this.response = response;
			const first = Math.max(self.performance.now(), stats.loading.start);
			self.clearTimeout(this.requestTimeout);
			config.timeout = maxLoadTimeMs;
			this.requestTimeout = self.setTimeout(() => {
				this.loadtimeout();
			}, maxLoadTimeMs - (first - stats.loading.start));
			if (!response.ok) {
				const { status, statusText } = response;
				throw new FetchError(statusText || "fetch, bad network response", status, response);
			}
			stats.loading.first = first;
			stats.total = getContentLength(response.headers) || stats.total;
			const onProgress = (_this$callbacks = this.callbacks) == null ? void 0 : _this$callbacks.onProgress;
			if (onProgress && isFiniteNumber(config.highWaterMark)) return this.loadProgressively(response, stats, context, config.highWaterMark, onProgress);
			if (isArrayBuffer) return response.arrayBuffer();
			if (context.responseType === "json") return response.json();
			return response.text();
		}).then((responseData) => {
			var _this$callbacks2, _this$callbacks3;
			const response = this.response;
			if (!response) throw new Error("loader destroyed");
			self.clearTimeout(this.requestTimeout);
			stats.loading.end = Math.max(self.performance.now(), stats.loading.first);
			const total = responseData[LENGTH];
			if (total) stats.loaded = stats.total = total;
			const loaderResponse = {
				url: response.url,
				data: responseData,
				code: response.status
			};
			const onProgress = (_this$callbacks2 = this.callbacks) == null ? void 0 : _this$callbacks2.onProgress;
			if (onProgress && !isFiniteNumber(config.highWaterMark)) onProgress(stats, context, responseData, response);
			(_this$callbacks3 = this.callbacks) == null || _this$callbacks3.onSuccess(loaderResponse, stats, context, response);
		}).catch((error) => {
			self.clearTimeout(this.requestTimeout);
			if (stats.aborted) return;
			const code = !error ? 0 : error.code || 0;
			const text = !error ? null : error.message;
			const retryConfig = config.loadPolicy.errorRetry;
			const retryCount = stats.retry;
			if (shouldRetry(retryConfig, retryCount, false, {
				url: context.url,
				data: void 0,
				code
			})) this.retry(retryConfig);
			else {
				var _this$callbacks4;
				logger.error(`${code} while loading ${context.url}`);
				(_this$callbacks4 = this.callbacks) == null || _this$callbacks4.onError({
					code,
					text
				}, context, error ? error.details : null, stats);
			}
		});
	}
	getCacheAge() {
		let result = null;
		if (this.response) {
			const ageHeader = this.response.headers.get("age");
			result = ageHeader ? parseFloat(ageHeader) : null;
		}
		return result;
	}
	getResponseHeader(name) {
		return this.response ? this.response.headers.get(name) : null;
	}
	loadProgressively(response, stats, context, highWaterMark = 0, onProgress) {
		const chunkCache = new ChunkCache();
		const reader = response.body.getReader();
		const pump = () => {
			return reader.read().then((data) => {
				if (data.done) {
					if (chunkCache.dataLength) onProgress(stats, context, chunkCache.flush().buffer, response);
					return Promise.resolve(/* @__PURE__ */ new ArrayBuffer(0));
				}
				const chunk = data.value;
				const len = chunk.length;
				stats.loaded += len;
				if (len < highWaterMark || chunkCache.dataLength) {
					chunkCache.push(chunk);
					if (chunkCache.dataLength >= highWaterMark) onProgress(stats, context, chunkCache.flush().buffer, response);
				} else onProgress(stats, context, chunk.buffer, response);
				return pump();
			}).catch(() => {
				return Promise.reject();
			});
		};
		return pump();
	}
};
function getRequestParameters(context, signal) {
	const initParams = {
		method: "GET",
		mode: "cors",
		credentials: "same-origin",
		signal,
		headers: new self.Headers(_extends({}, context.headers))
	};
	if (context.rangeEnd) initParams.headers.set("Range", "bytes=" + context.rangeStart + "-" + String(context.rangeEnd - 1));
	return initParams;
}
function getByteRangeLength(byteRangeHeader) {
	const result = BYTERANGE.exec(byteRangeHeader);
	if (result) return parseInt(result[2]) - parseInt(result[1]) + 1;
}
function getContentLength(headers) {
	const contentRange = headers.get("Content-Range");
	if (contentRange) {
		const byteRangeLength = getByteRangeLength(contentRange);
		if (isFiniteNumber(byteRangeLength)) return byteRangeLength;
	}
	const contentLength = headers.get("Content-Length");
	if (contentLength) return parseInt(contentLength);
}
function getRequest(context, initParams) {
	return new self.Request(context.url, initParams);
}
var FetchError = class extends Error {
	constructor(message, code, details) {
		super(message);
		this.code = void 0;
		this.details = void 0;
		this.code = code;
		this.details = details;
	}
};
var clamp = (val, min, max) => {
	return Math.max(min, Math.min(val, max));
};
var AGE_HEADER_LINE_REGEX = /^age:\s*[\d.]+\s*$/im;
var XhrLoader = class extends BaseLoader {
	constructor(config) {
		super();
		this.xhrSetup = void 0;
		this.loader = null;
		this.xhrSetup = config.xhrSetup || null;
	}
	destroy() {
		super.destroy();
		this.loader = null;
		this.xhrSetup = null;
	}
	abortInternal() {
		const loader = this.loader;
		self.clearTimeout(this.requestTimeout);
		self.clearTimeout(this.retryTimeout);
		if (loader) {
			loader.onreadystatechange = null;
			loader.onprogress = null;
			if (loader.readyState !== 4) {
				this.stats.aborted = true;
				loader.abort();
			}
		}
	}
	getNetworkDetails() {
		return this.loader;
	}
	resetInternalLoader() {
		this.loader = null;
	}
	loadInternal() {
		const { config, context } = this;
		if (!config || !context) return;
		const xhr = this.loader = new self.XMLHttpRequest();
		const stats = this.stats;
		stats.loading.first = 0;
		stats.loaded = 0;
		stats.aborted = false;
		const xhrSetup = this.xhrSetup;
		if (xhrSetup) Promise.resolve().then(() => {
			if (this.loader !== xhr || this.stats.aborted) return;
			return xhrSetup.call(this, xhr, context.url, context);
		}).catch((error) => {
			if (this.loader !== xhr || this.stats.aborted) return;
			xhr.open("GET", context.url, true);
			return xhrSetup.call(this, xhr, context.url, context);
		}).then(() => {
			if (this.loader !== xhr || this.stats.aborted) return;
			this.openAndSendXhr(xhr, context, config);
		}).catch((error) => {
			var _this$callbacks;
			(_this$callbacks = this.callbacks) == null || _this$callbacks.onError({
				code: xhr.status,
				text: error.message
			}, context, xhr, stats);
		});
		else this.openAndSendXhr(xhr, context, config);
	}
	openAndSendXhr(xhr, context, config) {
		if (!xhr.readyState) xhr.open("GET", context.url, true);
		const headers = context.headers;
		const { maxTimeToFirstByteMs, maxLoadTimeMs } = config.loadPolicy;
		if (headers) for (const header in headers) xhr.setRequestHeader(header, headers[header]);
		if (context.rangeEnd) xhr.setRequestHeader("Range", `bytes=${context.rangeStart}-${context.rangeEnd - 1}`);
		xhr.onreadystatechange = this.readystatechange.bind(this);
		xhr.onprogress = this.loadprogress.bind(this);
		xhr.responseType = context.responseType;
		self.clearTimeout(this.requestTimeout);
		config.timeout = maxTimeToFirstByteMs && isFiniteNumber(maxTimeToFirstByteMs) ? maxTimeToFirstByteMs : maxLoadTimeMs;
		this.requestTimeout = self.setTimeout(this.loadtimeout.bind(this), config.timeout);
		xhr.send();
	}
	readystatechange() {
		const { context, loader: xhr, stats } = this;
		if (!context || !xhr) return;
		const readyState = xhr.readyState;
		const config = this.config;
		if (stats.aborted) return;
		if (readyState >= 2) {
			if (stats.loading.first === 0) {
				stats.loading.first = Math.max(self.performance.now(), stats.loading.start);
				if (config.timeout !== config.loadPolicy.maxLoadTimeMs) {
					self.clearTimeout(this.requestTimeout);
					config.timeout = config.loadPolicy.maxLoadTimeMs;
					this.requestTimeout = self.setTimeout(this.loadtimeout.bind(this), config.loadPolicy.maxLoadTimeMs - (stats.loading.first - stats.loading.start));
				}
			}
			if (readyState === 4) {
				self.clearTimeout(this.requestTimeout);
				xhr.onreadystatechange = null;
				xhr.onprogress = null;
				const status = xhr.status;
				const useResponseText = xhr.responseType === "text" ? xhr.responseText : null;
				if (status >= 200 && status < 300) {
					const data = useResponseText != null ? useResponseText : xhr.response;
					if (data != null) {
						var _this$callbacks2, _this$callbacks3;
						stats.loading.end = Math.max(self.performance.now(), stats.loading.first);
						const len = xhr.responseType === "arraybuffer" ? data.byteLength : data.length;
						stats.loaded = stats.total = len;
						stats.bwEstimate = stats.total * 8e3 / (stats.loading.end - stats.loading.first);
						const onProgress = (_this$callbacks2 = this.callbacks) == null ? void 0 : _this$callbacks2.onProgress;
						if (onProgress) onProgress(stats, context, data, xhr);
						const _response = {
							url: xhr.responseURL,
							data,
							code: status
						};
						if (context.rangeEnd && len !== context.rangeEnd - context.rangeStart) logger.warn(`Payload length ${len} does not match requested Range: bytes=${context.rangeStart}-${context.rangeEnd - 1}`);
						(_this$callbacks3 = this.callbacks) == null || _this$callbacks3.onSuccess(_response, stats, context, xhr);
						return;
					}
				}
				const retryConfig = config.loadPolicy.errorRetry;
				const retryCount = stats.retry;
				if (shouldRetry(retryConfig, retryCount, false, {
					url: context.url,
					data: void 0,
					code: status
				})) this.retry(retryConfig);
				else {
					var _this$callbacks4;
					logger.error(`${status} while loading ${context.url}`);
					(_this$callbacks4 = this.callbacks) == null || _this$callbacks4.onError({
						code: status,
						text: xhr.statusText
					}, context, xhr, stats);
				}
			}
		}
	}
	loadprogress(event) {
		const stats = this.stats;
		stats.loaded = event.loaded;
		if (event.lengthComputable) stats.total = event.total;
	}
	getCacheAge() {
		let result = null;
		if (this.loader && AGE_HEADER_LINE_REGEX.test(this.loader.getAllResponseHeaders())) {
			const ageHeader = this.loader.getResponseHeader("age");
			result = ageHeader ? parseFloat(ageHeader) : null;
		}
		return result;
	}
	getResponseHeader(name) {
		if (this.loader && new RegExp(`^${name}:\\s*[\\d.]+\\s*$`, "im").test(this.loader.getAllResponseHeaders())) return this.loader.getResponseHeader(name);
		return null;
	}
};
/**
* @deprecated use fragLoadPolicy.default
*/
/**
* @deprecated use manifestLoadPolicy.default and playlistLoadPolicy.default
*/
var defaultLoadPolicy = {
	maxTimeToFirstByteMs: 8e3,
	maxLoadTimeMs: 2e4,
	timeoutRetry: null,
	errorRetry: null
};
/**
* @ignore
* If possible, keep hlsDefaultConfig shallow
* It is cloned whenever a new Hls instance is created, by keeping the config
* shallow the properties are cloned, and we don't end up manipulating the default
*/
var hlsDefaultConfig = _objectSpread2(_objectSpread2({
	autoStartLoad: true,
	startPosition: -1,
	defaultAudioCodec: void 0,
	debug: false,
	capLevelOnFPSDrop: false,
	capLevelToPlayerSize: false,
	ignoreDevicePixelRatio: false,
	maxDevicePixelRatio: Number.POSITIVE_INFINITY,
	preferManagedMediaSource: false,
	initialLiveManifestSize: 1,
	maxBufferLength: 30,
	backBufferLength: Infinity,
	frontBufferFlushThreshold: Infinity,
	loopBackBufferFlush: void 0,
	startOnSegmentBoundary: false,
	nextAudioTrackBufferFlushForwardOffset: .25,
	maxBufferSize: 6e7,
	maxFragLookUpTolerance: .25,
	maxBufferHole: .1,
	detectStallWithCurrentTimeMs: 1250,
	highBufferWatchdogPeriod: 2,
	nudgeOffset: .1,
	nudgeMaxRetry: 3,
	nudgeOnVideoHole: true,
	skipBufferHolePadding: .1,
	liveSyncMode: "edge",
	liveSyncDurationCount: 3,
	liveSyncOnStallIncrease: 1,
	liveMaxLatencyDurationCount: Infinity,
	liveMaxUnchangedPlaylistRefresh: Infinity,
	liveSyncDuration: void 0,
	liveMaxLatencyDuration: void 0,
	maxLiveSyncPlaybackRate: 1,
	liveDurationInfinity: false,
	/**
	* @deprecated use backBufferLength
	*/
	liveBackBufferLength: null,
	maxMaxBufferLength: 600,
	enableWorker: true,
	workerPath: null,
	enableSoftwareAES: true,
	startLevel: void 0,
	startFragPrefetch: false,
	fpsDroppedMonitoringPeriod: 5e3,
	fpsDroppedMonitoringThreshold: .2,
	appendErrorMaxRetry: 3,
	appendTimeout: Infinity,
	ignorePlaylistParsingErrors: false,
	loader: XhrLoader,
	fLoader: void 0,
	pLoader: void 0,
	xhrSetup: void 0,
	licenseXhrSetup: void 0,
	licenseResponseCallback: void 0,
	stretchShortVideoTrack: false,
	maxAudioFramesDrift: 1,
	forceKeyFrameOnDiscontinuity: true,
	handleMpegTsVideoIntegrityErrors: "process",
	abrEwmaFastLive: 3,
	abrEwmaSlowLive: 9,
	abrEwmaFastVoD: 3,
	abrEwmaSlowVoD: 9,
	abrEwmaDefaultEstimate: 5e5,
	abrEwmaDefaultEstimateMax: 5e6,
	abrBandWidthFactor: .95,
	abrBandWidthUpFactor: .7,
	abrMaxWithRealBitrate: false,
	abrSwitchInterval: 0,
	maxStarvationDelay: 4,
	maxLoadingDelay: 4,
	minAutoBitrate: 0,
	emeEnabled: false,
	widevineLicenseUrl: void 0,
	drmSystems: {},
	drmSystemOptions: {},
	requestMediaKeySystemAccessFunc: null,
	requireKeySystemAccessOnStart: false,
	reuseKeySessions: false,
	testBandwidth: true,
	progressive: false,
	lowLatencyMode: true,
	cmcd: void 0,
	enableDateRangeMetadataCues: true,
	enableEmsgMetadataCues: true,
	enableEmsgKLVMetadata: false,
	enableID3MetadataCues: true,
	emsgKLVSchemaUri: void 0,
	enableInterstitialPlayback: false,
	interstitialAppendInPlace: true,
	interstitialLiveLookAhead: 10,
	iframeCacheLimit: 2097152,
	useMediaCapabilities: false,
	preserveManualLevelOnError: false,
	errorPenaltyExpireMs: 0,
	certLoadPolicy: { default: defaultLoadPolicy },
	keyLoadPolicy: { default: {
		maxTimeToFirstByteMs: 8e3,
		maxLoadTimeMs: 2e4,
		timeoutRetry: {
			maxNumRetry: 1,
			retryDelayMs: 1e3,
			maxRetryDelayMs: 2e4,
			backoff: "linear"
		},
		errorRetry: {
			maxNumRetry: 8,
			retryDelayMs: 1e3,
			maxRetryDelayMs: 2e4,
			backoff: "linear"
		}
	} },
	manifestLoadPolicy: { default: {
		maxTimeToFirstByteMs: Infinity,
		maxLoadTimeMs: 2e4,
		timeoutRetry: {
			maxNumRetry: 2,
			retryDelayMs: 0,
			maxRetryDelayMs: 0
		},
		errorRetry: {
			maxNumRetry: 1,
			retryDelayMs: 1e3,
			maxRetryDelayMs: 8e3
		}
	} },
	playlistLoadPolicy: { default: {
		maxTimeToFirstByteMs: 1e4,
		maxLoadTimeMs: 2e4,
		timeoutRetry: {
			maxNumRetry: 2,
			retryDelayMs: 0,
			maxRetryDelayMs: 0
		},
		errorRetry: {
			maxNumRetry: 2,
			retryDelayMs: 1e3,
			maxRetryDelayMs: 8e3
		}
	} },
	fragLoadPolicy: { default: {
		maxTimeToFirstByteMs: 1e4,
		maxLoadTimeMs: 12e4,
		timeoutRetry: {
			maxNumRetry: 4,
			retryDelayMs: 0,
			maxRetryDelayMs: 0
		},
		errorRetry: {
			maxNumRetry: 6,
			retryDelayMs: 1e3,
			maxRetryDelayMs: 8e3
		}
	} },
	steeringManifestLoadPolicy: { default: {
		maxTimeToFirstByteMs: 1e4,
		maxLoadTimeMs: 2e4,
		timeoutRetry: {
			maxNumRetry: 2,
			retryDelayMs: 0,
			maxRetryDelayMs: 0
		},
		errorRetry: {
			maxNumRetry: 1,
			retryDelayMs: 1e3,
			maxRetryDelayMs: 8e3
		}
	} },
	interstitialAssetListLoadPolicy: { default: defaultLoadPolicy },
	manifestLoadingTimeOut: 1e4,
	manifestLoadingMaxRetry: 1,
	manifestLoadingRetryDelay: 1e3,
	manifestLoadingMaxRetryTimeout: 64e3,
	levelLoadingTimeOut: 1e4,
	levelLoadingMaxRetry: 4,
	levelLoadingRetryDelay: 1e3,
	levelLoadingMaxRetryTimeout: 64e3,
	fragLoadingTimeOut: 2e4,
	fragLoadingMaxRetry: 6,
	fragLoadingRetryDelay: 1e3,
	fragLoadingMaxRetryTimeout: 64e3,
	streamController: StreamController,
	abrController: AbrController,
	bufferController: BufferController,
	capLevelController: CapLevelController,
	errorController: ErrorController,
	fpsController: FPSController,
	id3TrackController: ID3TrackController,
	gapController: GapController,
	latencyController: LatencyController
}, timelineConfig()), {}, {
	subtitleStreamController: void 0,
	subtitleTrackController: void 0,
	timelineController: void 0,
	audioStreamController: void 0,
	audioTrackController: void 0,
	emeController: void 0,
	cmcdController: void 0,
	contentSteeringController: ContentSteeringController,
	iframeController: void 0,
	interstitialsController: void 0
});
function timelineConfig() {
	return {
		cueHandler: Cues,
		enableWebVTT: false,
		enableIMSC1: false,
		enableCEA708Captions: false,
		captionsTextTrack1Label: "English",
		captionsTextTrack1LanguageCode: "en",
		captionsTextTrack2Label: "Spanish",
		captionsTextTrack2LanguageCode: "es",
		captionsTextTrack3Label: "Unknown CC",
		captionsTextTrack3LanguageCode: "",
		captionsTextTrack4Label: "Unknown CC",
		captionsTextTrack4LanguageCode: "",
		renderTextTracksNatively: true
	};
}
/**
* @ignore
*/
function mergeConfig(defaultConfig, userConfig, logger) {
	if ((userConfig.liveSyncDurationCount || userConfig.liveMaxLatencyDurationCount) && (userConfig.liveSyncDuration || userConfig.liveMaxLatencyDuration)) throw new Error("Illegal hls.js config: don't mix up liveSyncDurationCount/liveMaxLatencyDurationCount and liveSyncDuration/liveMaxLatencyDuration");
	if (userConfig.liveMaxLatencyDurationCount !== void 0 && (userConfig.liveSyncDurationCount === void 0 || userConfig.liveMaxLatencyDurationCount <= userConfig.liveSyncDurationCount)) throw new Error("Illegal hls.js config: \"liveMaxLatencyDurationCount\" must be greater than \"liveSyncDurationCount\"");
	if (userConfig.liveMaxLatencyDuration !== void 0 && (userConfig.liveSyncDuration === void 0 || userConfig.liveMaxLatencyDuration <= userConfig.liveSyncDuration)) throw new Error("Illegal hls.js config: \"liveMaxLatencyDuration\" must be greater than \"liveSyncDuration\"");
	if (userConfig.liveMaxUnchangedPlaylistRefresh !== void 0) {
		const liveMaxUnchangedPlaylistRefresh = userConfig.liveMaxUnchangedPlaylistRefresh;
		const clampedValue = clamp(liveMaxUnchangedPlaylistRefresh, 2, Infinity);
		if (clampedValue !== liveMaxUnchangedPlaylistRefresh) logger.warn(`hls.js config: "liveMaxUnchangedPlaylistRefresh" clamped from ${liveMaxUnchangedPlaylistRefresh} to ${clampedValue}.`);
		userConfig.liveMaxUnchangedPlaylistRefresh = clampedValue;
	}
	const defaultsCopy = deepCpy(defaultConfig);
	const deprecatedSettingTypes = [
		"manifest",
		"level",
		"frag"
	];
	const deprecatedSettings = [
		"TimeOut",
		"MaxRetry",
		"RetryDelay",
		"MaxRetryTimeout"
	];
	deprecatedSettingTypes.forEach((type) => {
		const policyName = `${type === "level" ? "playlist" : type}LoadPolicy`;
		const policyNotSet = userConfig[policyName] === void 0;
		const report = [];
		deprecatedSettings.forEach((setting) => {
			const deprecatedSetting = `${type}Loading${setting}`;
			const value = userConfig[deprecatedSetting];
			if (value !== void 0 && policyNotSet) {
				report.push(deprecatedSetting);
				const settings = defaultsCopy[policyName].default;
				userConfig[policyName] = { default: settings };
				switch (setting) {
					case "TimeOut":
						settings.maxLoadTimeMs = value;
						settings.maxTimeToFirstByteMs = value;
						break;
					case "MaxRetry":
						settings.errorRetry.maxNumRetry = value;
						settings.timeoutRetry.maxNumRetry = value;
						break;
					case "RetryDelay":
						settings.errorRetry.retryDelayMs = value;
						settings.timeoutRetry.retryDelayMs = value;
						break;
					case "MaxRetryTimeout":
						settings.errorRetry.maxRetryDelayMs = value;
						settings.timeoutRetry.maxRetryDelayMs = value;
				}
			}
		});
		if (report.length) logger.warn(`hls.js config: "${report.join("\", \"")}" setting(s) are deprecated, use "${policyName}": ${stringify(userConfig[policyName])}`);
	});
	return _objectSpread2(_objectSpread2({}, defaultsCopy), userConfig);
}
function deepCpy(obj) {
	if (obj && typeof obj === "object") {
		if (Array.isArray(obj)) return obj.map(deepCpy);
		return Object.keys(obj).reduce((result, key) => {
			result[key] = deepCpy(obj[key]);
			return result;
		}, {});
	}
	return obj;
}
/**
* @ignore
*/
function enableStreamingMode(config, logger) {
	const currentLoader = config.loader;
	if (currentLoader !== FetchLoader && currentLoader !== XhrLoader) {
		logger.log("[config]: Custom loader detected, cannot enable progressive streaming");
		config.progressive = false;
	} else if (fetchSupported()) {
		config.loader = FetchLoader;
		config.progressive = true;
		config.enableSoftwareAES = true;
		logger.log("[config]: Progressive streaming enabled, using FetchLoader");
	}
}
var LevelController = class extends BasePlaylistController {
	constructor(hls, contentSteeringController) {
		super(hls, "level-controller");
		this._levels = [];
		this._firstLevel = -1;
		this._maxAutoLevel = -1;
		this._startLevel = void 0;
		this.currentLevel = null;
		this.currentLevelIndex = -1;
		this.manualLevelIndex = -1;
		this.steering = void 0;
		this.lastABRSwitchTime = -1;
		this._iframeVariants = [];
		this.onParsedComplete = void 0;
		this.steering = contentSteeringController;
		this._registerListeners();
	}
	_registerListeners() {
		const { hls } = this;
		hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.on(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
		hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
		hls.on(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
		hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
		hls.on(Events.ERROR, this.onError, this);
	}
	_unregisterListeners() {
		const { hls } = this;
		hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.off(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
		hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
		hls.off(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
		hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
		hls.off(Events.ERROR, this.onError, this);
	}
	destroy() {
		this._unregisterListeners();
		this.steering = null;
		this.resetLevels();
		super.destroy();
	}
	stopLoad() {
		this._levels.forEach((level) => {
			level.loadError = 0;
			level.fragmentError = 0;
		});
		super.stopLoad();
	}
	resetLevels() {
		this._startLevel = void 0;
		this.manualLevelIndex = -1;
		this.currentLevelIndex = -1;
		this.currentLevel = null;
		this._levels = [];
		this._maxAutoLevel = -1;
		this._iframeVariants = [];
	}
	onManifestLoading(event, data) {
		this.resetLevels();
	}
	onManifestLoaded(event, data) {
		const preferManagedMediaSource = this.hls.config.preferManagedMediaSource;
		const levels = [];
		const redundantSet = {};
		const generatePathwaySet = {};
		let resolutionFound = false;
		let videoCodecFound = false;
		let audioCodecFound = false;
		let imageCodecFound = false;
		data.levels.forEach((levelParsed) => {
			const attributes = levelParsed.attrs;
			const supported = setTrackCodecsAndReturnSupported(levelParsed, preferManagedMediaSource);
			const { audioCodec, videoCodec, imageCodec, width, height } = levelParsed;
			if (!supported) {
				this.log(`Some or all CODECS not supported "${attributes.CODECS}"`);
				return;
			}
			resolutionFound || (resolutionFound = !!(width && height));
			videoCodecFound || (videoCodecFound = !!videoCodec);
			audioCodecFound || (audioCodecFound = !!audioCodec);
			imageCodecFound || (imageCodecFound = !!imageCodec);
			const { CODECS, "FRAME-RATE": FRAMERATE, "HDCP-LEVEL": HDCP, "PATHWAY-ID": PATHWAY, RESOLUTION, "VIDEO-RANGE": VIDEO_RANGE } = attributes;
			const levelKey = `${`${PATHWAY || "."}-`}${levelParsed.bitrate}-${RESOLUTION}-${FRAMERATE}-${CODECS}-${VIDEO_RANGE}-${HDCP}`;
			if (!redundantSet[levelKey]) {
				const level = this.createLevel(levelParsed);
				redundantSet[levelKey] = level;
				generatePathwaySet[levelKey] = 1;
				levels.push(level);
			} else if (redundantSet[levelKey].uri !== levelParsed.url && !levelParsed.attrs["PATHWAY-ID"]) {
				const pathwayCount = generatePathwaySet[levelKey] += 1;
				levelParsed.attrs["PATHWAY-ID"] = new Array(pathwayCount + 1).join(".");
				const level = this.createLevel(levelParsed);
				redundantSet[levelKey] = level;
				levels.push(level);
			} else if (!levelParsed.iframes) {
				redundantSet[levelKey].addGroupId("audio", attributes.AUDIO);
				redundantSet[levelKey].addGroupId("text", attributes.SUBTITLES);
			}
		});
		this.filterAndSortMediaOptions(levels, data, resolutionFound, videoCodecFound, audioCodecFound, imageCodecFound);
	}
	createLevel(levelParsed) {
		const level = new Level(levelParsed);
		const supplemental = levelParsed.supplemental;
		if (supplemental != null && supplemental.videoCodec && !isVideoSupported(supplemental.videoCodec, this.hls.config.preferManagedMediaSource)) {
			const error = /* @__PURE__ */ new Error(`SUPPLEMENTAL-CODECS not supported "${supplemental.videoCodec}"`);
			this.log(error.message);
			level.supportedResult = emptyEsExports.getUnsupportedResult(error, []);
		}
		return level;
	}
	filterAndSortMediaOptions(filteredLevels, data, resolutionFound, videoCodecFound, audioCodecFound, imageCodecFound) {
		var _data$stats;
		let audioTracks = [];
		let subtitleTracks = [];
		let levels = filteredLevels;
		const statsParsing = ((_data$stats = data.stats) == null ? void 0 : _data$stats.parsing) || {};
		const preferManagedMediaSource = this.hls.config.preferManagedMediaSource;
		if ((resolutionFound || videoCodecFound) && audioCodecFound) levels = levels.filter(({ videoCodec, videoRange, width, height }) => (!!videoCodec || !!(width && height)) && isVideoRange(videoRange));
		if (videoCodecFound && imageCodecFound) levels = levels.filter((lvl) => !lvl.imageCodec);
		if (levels.length === 0) {
			Promise.resolve().then(() => {
				if (this.hls) {
					let message = "no level with compatible codecs found in manifest";
					let reason = message;
					if (data.levels.length) {
						reason = `one or more CODECS in variant not supported: ${stringify(data.levels.map((level) => level.attrs.CODECS).filter((value, index, array) => array.indexOf(value) === index))}`;
						this.warn(reason);
						message += ` (${reason})`;
					}
					const error = new Error(message);
					this.hls.trigger(Events.ERROR, {
						type: ErrorTypes.MEDIA_ERROR,
						details: ErrorDetails.MANIFEST_INCOMPATIBLE_CODECS_ERROR,
						fatal: true,
						url: data.url,
						error,
						reason
					});
				}
			});
			statsParsing.end = performance.now();
			return;
		}
		if (data.audioTracks) {
			audioTracks = data.audioTracks.filter((track) => !track.audioCodec || isAudioSupported(track.audioCodec, preferManagedMediaSource));
			assignTrackIdsByGroup(audioTracks);
		}
		if (data.subtitles) {
			subtitleTracks = data.subtitles;
			assignTrackIdsByGroup(subtitleTracks);
		}
		const unsortedLevels = levels.slice(0);
		levels.sort((a, b) => {
			if (a.attrs["HDCP-LEVEL"] !== b.attrs["HDCP-LEVEL"]) return (a.attrs["HDCP-LEVEL"] || "") > (b.attrs["HDCP-LEVEL"] || "") ? 1 : -1;
			if (resolutionFound && a.height !== b.height) return a.height - b.height;
			if (a.frameRate !== b.frameRate) return a.frameRate - b.frameRate;
			if (a.videoRange !== b.videoRange) return VideoRangeValues.indexOf(a.videoRange) - VideoRangeValues.indexOf(b.videoRange);
			if (a.videoCodec !== b.videoCodec) {
				const valueA = videoCodecPreferenceValue(a.videoCodec);
				const valueB = videoCodecPreferenceValue(b.videoCodec);
				if (valueA !== valueB) return valueB - valueA;
			}
			if (a.uri === b.uri && a.codecSet !== b.codecSet) {
				const valueA = codecsSetSelectionPreferenceValue(a.codecSet);
				const valueB = codecsSetSelectionPreferenceValue(b.codecSet);
				if (valueA !== valueB) return valueB - valueA;
			}
			if (a.averageBitrate !== b.averageBitrate) return a.averageBitrate - b.averageBitrate;
			return 0;
		});
		let firstLevelInPlaylist = unsortedLevels[0];
		if (this.steering) {
			levels = this.steering.filterParsedLevels(levels);
			if (levels.length !== unsortedLevels.length) {
				for (let i = 0; i < unsortedLevels.length; i++) if (unsortedLevels[i].pathwayId === levels[0].pathwayId) {
					firstLevelInPlaylist = unsortedLevels[i];
					break;
				}
			}
		}
		this._levels = levels;
		for (let i = 0; i < levels.length; i++) if (levels[i] === firstLevelInPlaylist) {
			var _this$hls$userConfig;
			this._firstLevel = i;
			const firstLevelBitrate = firstLevelInPlaylist.bitrate;
			const bandwidthEstimate = this.hls.bandwidthEstimate;
			this.log(`manifest loaded, ${levels.length} level(s) found, first bitrate: ${firstLevelBitrate}`);
			if (((_this$hls$userConfig = this.hls.userConfig) == null ? void 0 : _this$hls$userConfig.abrEwmaDefaultEstimate) === void 0) {
				const startingBwEstimate = Math.min(firstLevelBitrate, this.hls.config.abrEwmaDefaultEstimateMax);
				if (startingBwEstimate > bandwidthEstimate && bandwidthEstimate === this.hls.abrEwmaDefaultEstimate) this.hls.bandwidthEstimate = startingBwEstimate;
			}
			break;
		}
		const iframeVariants = data.iframeVariants.filter((parsedVariant) => setTrackCodecsAndReturnSupported(parsedVariant, preferManagedMediaSource));
		this._iframeVariants = iframeVariants;
		const audioOnly = audioCodecFound && !videoCodecFound;
		const config = this.hls.config;
		const altAudioEnabled = !!(config.audioStreamController && config.audioTrackController);
		const edata = {
			levels,
			audioTracks,
			subtitleTracks,
			iframeVariants,
			sessionData: data.sessionData,
			sessionKeys: data.sessionKeys,
			firstLevel: this._firstLevel,
			stats: data.stats,
			audio: audioCodecFound,
			video: videoCodecFound,
			altAudio: altAudioEnabled && !audioOnly && audioTracks.some((t) => !!t.url)
		};
		statsParsing.end = performance.now();
		this.hls.trigger(Events.MANIFEST_PARSED, edata);
	}
	get iframeVariants() {
		if (this._iframeVariants.length === 0) return null;
		return this._iframeVariants;
	}
	get levels() {
		if (this._levels.length === 0) return null;
		return this._levels;
	}
	get loadLevelObj() {
		return this.currentLevel;
	}
	get level() {
		return this.currentLevelIndex;
	}
	set level(newLevel) {
		const levels = this._levels;
		if (levels.length === 0) return;
		if (newLevel < 0 || newLevel >= levels.length) {
			const error = /* @__PURE__ */ new Error("invalid level idx");
			const fatal = newLevel < 0;
			this.hls.trigger(Events.ERROR, {
				type: ErrorTypes.OTHER_ERROR,
				details: ErrorDetails.LEVEL_SWITCH_ERROR,
				level: newLevel,
				fatal,
				error,
				reason: error.message
			});
			if (fatal) return;
			newLevel = Math.min(newLevel, levels.length - 1);
		}
		const lastLevelIndex = this.currentLevelIndex;
		const lastLevel = this.currentLevel;
		const lastPathwayId = lastLevel ? lastLevel.attrs["PATHWAY-ID"] : void 0;
		const level = levels[newLevel];
		const pathwayId = level.attrs["PATHWAY-ID"];
		this.currentLevelIndex = newLevel;
		this.currentLevel = level;
		if (lastLevelIndex === newLevel && lastLevel && lastPathwayId === pathwayId) return;
		this.log(`Switching to level ${newLevel} (${level.height ? level.height + "p " : ""}${level.videoRange ? level.videoRange + " " : ""}${level.codecSet ? level.codecSet + " " : ""}@${level.bitrate})${pathwayId ? " with Pathway " + pathwayId : ""} from level ${lastLevelIndex}${lastPathwayId ? " with Pathway " + lastPathwayId : ""}`);
		const levelSwitchingData = {
			level: newLevel,
			attrs: level.attrs,
			details: level.details,
			bitrate: level.bitrate,
			averageBitrate: level.averageBitrate,
			maxBitrate: level.maxBitrate,
			realBitrate: level.realBitrate,
			width: level.width,
			height: level.height,
			codecSet: level.codecSet,
			audioCodec: level.audioCodec,
			videoCodec: level.videoCodec,
			audioGroups: level.audioGroups,
			subtitleGroups: level.subtitleGroups,
			loaded: level.loaded,
			loadError: level.loadError,
			fragmentError: level.fragmentError,
			name: level.name,
			id: level.id,
			uri: level.uri,
			url: level.url,
			urlId: 0,
			audioGroupIds: level.audioGroupIds,
			textGroupIds: level.textGroupIds
		};
		this.hls.trigger(Events.LEVEL_SWITCHING, levelSwitchingData);
		const levelDetails = level.details;
		if (!levelDetails || levelDetails.live) {
			const hlsUrlParameters = this.switchParams(level.uri, lastLevel == null ? void 0 : lastLevel.details, levelDetails);
			this.loadPlaylist(hlsUrlParameters);
		}
	}
	get manualLevel() {
		return this.manualLevelIndex;
	}
	set manualLevel(newLevel) {
		this.manualLevelIndex = newLevel;
		if (this._startLevel === void 0) this._startLevel = newLevel;
		if (newLevel !== -1) this.level = newLevel;
	}
	get firstLevel() {
		return this._firstLevel;
	}
	set firstLevel(newLevel) {
		this._firstLevel = newLevel;
	}
	get startLevel() {
		if (this._startLevel === void 0) {
			const configStartLevel = this.hls.config.startLevel;
			if (configStartLevel !== void 0) return configStartLevel;
			return this.hls.firstAutoLevel;
		}
		return this._startLevel;
	}
	set startLevel(newLevel) {
		this._startLevel = newLevel;
	}
	get pathways() {
		if (this.steering) return this.steering.pathways();
		return [];
	}
	get pathwayPriority() {
		if (this.steering) return this.steering.pathwayPriority;
		return null;
	}
	set pathwayPriority(pathwayPriority) {
		if (this.steering) {
			const pathwaysList = this.steering.pathways();
			const filteredPathwayPriority = pathwayPriority.filter((pathwayId) => {
				return pathwaysList.indexOf(pathwayId) !== -1;
			});
			if (pathwayPriority.length < 1) {
				this.warn(`pathwayPriority ${pathwayPriority} should contain at least one pathway from list: ${pathwaysList}`);
				return;
			}
			this.steering.pathwayPriority = filteredPathwayPriority;
		}
	}
	onError(event, data) {
		if (data.fatal || !data.context) return;
		if (data.context.type === LoaderContextType.LEVEL && data.context.level === this.level) this.checkRetry(data);
	}
	onFragBuffered(event, { frag }) {
		if (frag.type === PlaylistLevelType.MAIN) {
			const el = frag.elementaryStreams;
			if (!Object.keys(el).some((type) => !!el[type])) return;
			const level = this._levels[frag.level];
			if (level != null && level.loadError) {
				this.log(`Resetting level error count of ${level.loadError} on frag buffered`);
				level.loadError = 0;
			}
		}
	}
	onLevelLoaded(event, data) {
		var _data$deliveryDirecti2;
		const { level, details } = data;
		const curLevel = data.levelInfo;
		if (!curLevel) {
			var _data$deliveryDirecti;
			this.warn(`Invalid level index ${level}`);
			if ((_data$deliveryDirecti = data.deliveryDirectives) != null && _data$deliveryDirecti.skip) details.deltaUpdateFailed = true;
			return;
		}
		if (curLevel === this.currentLevel || data.withoutMultiVariant) {
			if (curLevel.fragmentError === 0) curLevel.loadError = 0;
			let previousDetails = curLevel.details;
			if (previousDetails === data.details && previousDetails.advanced) previousDetails = void 0;
			this.playlistLoaded(level, data, previousDetails);
		} else if ((_data$deliveryDirecti2 = data.deliveryDirectives) != null && _data$deliveryDirecti2.skip) details.deltaUpdateFailed = true;
	}
	loadPlaylist(hlsUrlParameters) {
		super.loadPlaylist();
		if (this.shouldLoadPlaylist(this.currentLevel)) this.scheduleLoading(this.currentLevel, hlsUrlParameters);
	}
	loadingPlaylist(currentLevel, hlsUrlParameters) {
		super.loadingPlaylist(currentLevel, hlsUrlParameters);
		const url = this.getUrlWithDirectives(currentLevel.uri, hlsUrlParameters);
		const currentLevelIndex = this.currentLevelIndex;
		const pathwayId = currentLevel.attrs["PATHWAY-ID"];
		const details = currentLevel.details;
		const age = details == null ? void 0 : details.age;
		this.log(`Loading level index ${currentLevelIndex}${(hlsUrlParameters == null ? void 0 : hlsUrlParameters.msn) !== void 0 ? " at sn " + hlsUrlParameters.msn + " part " + hlsUrlParameters.part : ""}${pathwayId ? " Pathway " + pathwayId : ""}${age && details.live ? " age " + age.toFixed(1) + (details.type ? " " + details.type || "" : "") : ""} ${url}`);
		this.hls.trigger(Events.LEVEL_LOADING, {
			url,
			level: currentLevelIndex,
			levelInfo: currentLevel,
			pathwayId: currentLevel.attrs["PATHWAY-ID"],
			id: 0,
			deliveryDirectives: hlsUrlParameters || null
		});
	}
	get nextLoadLevel() {
		if (this.manualLevelIndex !== -1) return this.manualLevelIndex;
		else return this.hls.nextAutoLevel;
	}
	set nextLoadLevel(nextLevel) {
		const currentLevel = this.currentLevelIndex;
		if (this.manualLevelIndex === -1 && nextLevel !== currentLevel && nextLevel !== -1) {
			const abrSwitchInterval = this.hls.config.abrSwitchInterval;
			if (abrSwitchInterval > 0) {
				const now = performance.now();
				const delta = now - this.lastABRSwitchTime;
				const intervalMs = abrSwitchInterval * 1e3;
				if (this.lastABRSwitchTime > -1 && delta < intervalMs) {
					this.warn(`Preventing ABR level switch: ${currentLevel} -> ${nextLevel} (${Math.round(delta)}ms < ${intervalMs}ms / ${abrSwitchInterval}s)`);
					return;
				}
				this.lastABRSwitchTime = now;
				this.log(`Allowing ABR level switch: ${currentLevel} -> ${nextLevel} (${Math.round(delta)}ms >= ${intervalMs}ms / ${abrSwitchInterval}s)`);
			}
		}
		this.level = nextLevel;
		if (this.manualLevelIndex === -1) this.hls.nextAutoLevel = nextLevel;
	}
	removeLevel(levelIndex) {
		var _this$currentLevel;
		if (this._levels.length === 1) return;
		const levels = this._levels.filter((level, index) => {
			if (index !== levelIndex) return true;
			if (this.steering) this.steering.removeLevel(level);
			if (level === this.currentLevel) {
				this.currentLevel = null;
				this.currentLevelIndex = -1;
				if (level.details) level.details.fragments.forEach((f) => f.level = -1);
			}
			return false;
		});
		reassignFragmentLevelIndexes(levels);
		this._levels = levels;
		if (this.currentLevelIndex > -1 && (_this$currentLevel = this.currentLevel) != null && _this$currentLevel.details) this.currentLevelIndex = this.currentLevel.details.fragments[0].level;
		if (this.manualLevelIndex > -1) this.manualLevelIndex = this.currentLevelIndex;
		const maxLevel = levels.length - 1;
		this._firstLevel = Math.min(this._firstLevel, maxLevel);
		if (this._startLevel) this._startLevel = Math.min(this._startLevel, maxLevel);
		this.hls.trigger(Events.LEVELS_UPDATED, { levels });
	}
	onLevelsUpdated(event, { levels }) {
		this._levels = levels;
	}
	checkMaxAutoUpdated() {
		const { autoLevelCapping, maxAutoLevel, maxHdcpLevel } = this.hls;
		if (this._maxAutoLevel !== maxAutoLevel) {
			this._maxAutoLevel = maxAutoLevel;
			this.hls.trigger(Events.MAX_AUTO_LEVEL_UPDATED, {
				autoLevelCapping,
				levels: this.levels,
				maxAutoLevel,
				minAutoLevel: this.hls.minAutoLevel,
				maxHdcpLevel
			});
		}
	}
};
function isAudioSupported(codec, preferManagedMediaSource) {
	return areCodecsMediaSourceSupported(codec, "audio", preferManagedMediaSource);
}
function isVideoSupported(codec, preferManagedMediaSource) {
	return areCodecsMediaSourceSupported(codec, "video", preferManagedMediaSource);
}
function setTrackCodecsAndReturnSupported(levelParsed, preferManagedMediaSource) {
	let { audioCodec, videoCodec } = levelParsed;
	if (audioCodec) levelParsed.audioCodec = audioCodec = getCodecCompatibleName(audioCodec, preferManagedMediaSource) || void 0;
	if (videoCodec) videoCodec = levelParsed.videoCodec = convertAVC1ToAVCOTI(videoCodec);
	const { unknownCodecs } = levelParsed;
	if ((unknownCodecs == null ? void 0 : unknownCodecs.length) || audioCodec && !isAudioSupported(audioCodec, preferManagedMediaSource) || videoCodec && !isVideoSupported(videoCodec, preferManagedMediaSource)) return false;
	return true;
}
function assignTrackIdsByGroup(tracks) {
	const groups = {};
	tracks.forEach((track) => {
		const groupId = track.groupId || "";
		track.id = groups[groupId] = groups[groupId] || 0;
		groups[groupId]++;
	});
}
var KeyLoader = class extends Logger {
	constructor(config, logger) {
		super("key-loader", logger);
		this.config = void 0;
		this.keyLoaderInfo = {};
		this.emeController = null;
		this.config = config;
	}
	abort(type) {
		for (const uri in this.keyLoaderInfo) {
			const loader = this.keyLoaderInfo[uri].loader;
			if (loader) {
				var _loader$context;
				if (type && type !== ((_loader$context = loader.context) == null ? void 0 : _loader$context.frag.type)) return;
				loader.abort();
			}
		}
	}
	destroy() {
		for (const uri in this.keyLoaderInfo) {
			const loader = this.keyLoaderInfo[uri].loader;
			if (loader) loader.destroy();
		}
		this.emeController = null;
		this.keyLoaderInfo = {};
	}
	loadClear(loadingFrag, encryptedFragments, startFragRequested) {
		if (this.emeController) return this.emeController.loadClear(loadingFrag, encryptedFragments, startFragRequested);
		return null;
	}
	load(frag, initDataPromise) {
		if (!frag.decryptdata && frag.encrypted && this.emeController && this.config.emeEnabled) return this.emeController.selectKeySystemFormat(frag).then((keySystemFormat) => {
			return this.loadInternal(frag, initDataPromise, keySystemFormat);
		});
		return this.loadInternal(frag, initDataPromise);
	}
	loadInternal(frag, initDataPromise, keySystemFormat) {
		const decryptdata = frag.decryptdata;
		if (!decryptdata) {
			const error = /* @__PURE__ */ new Error(keySystemFormat ? `Expected frag.decryptdata to be defined after setting format ${keySystemFormat}` : `Missing decryption data on fragment in onKeyLoading (emeEnabled with controller: ${this.emeController && this.config.emeEnabled})`);
			return Promise.reject(createKeyLoadError(frag, ErrorDetails.KEY_LOAD_ERROR, error));
		}
		const encryptedFrag = frag;
		switch (decryptdata.method) {
			case "SAMPLE-AES":
			case "SAMPLE-AES-CENC":
			case "SAMPLE-AES-CTR":
				if (decryptdata.keyFormat === "identity") return this.loadKeyHTTP(encryptedFrag);
				return initDataPromise ? initDataPromise.then(() => this.loadKeyEME(encryptedFrag)) : this.loadKeyEME(encryptedFrag);
			case "AES-128":
			case "AES-256":
			case "AES-256-CTR": return this.loadKeyHTTP(encryptedFrag);
			default: return Promise.reject(createKeyLoadError(frag, ErrorDetails.KEY_LOAD_ERROR, /* @__PURE__ */ new Error(`Key supplied with unsupported METHOD: "${decryptdata.method}"`)));
		}
	}
	loadKeyEME(frag) {
		if (this.emeController && this.config.emeEnabled) {
			var _frag$initSegment;
			if (!frag.decryptdata.keyId && (_frag$initSegment = frag.initSegment) != null && _frag$initSegment.data) {
				const keyIds = parseKeyIdsFromTenc(frag.initSegment.data);
				if (keyIds.length) {
					let keyId = keyIds[0];
					const keyUri = frag.decryptdata.uri;
					if (keyId.some((b) => b !== 0)) {
						this.log(`Using keyId found in init segment ${arrayToHex(keyId)} keyUri: ${keyUri}`);
						LevelKey.setKeyIdForUri(keyUri, keyId);
					} else {
						const keyIdPatch = LevelKey.addKeyIdForUri(keyUri);
						this.log(`Patching empty keyId with ${arrayToHex(keyIdPatch)} keyUri: ${keyUri}`);
						keyId = keyIdPatch;
					}
					frag.decryptdata.keyId = keyId;
				}
			}
			return this.emeController.loadKey(frag).then(() => ({
				frag,
				keyInfo: { decryptdata: frag.decryptdata }
			}));
		}
		return Promise.reject(createKeyLoadError(frag, ErrorDetails.KEY_LOAD_ERROR, /* @__PURE__ */ new Error(`emeEnabled with controller: ${this.emeController && this.config.emeEnabled})`)));
	}
	loadKeyHTTP(frag) {
		const decryptdata = frag.decryptdata;
		const uri = decryptdata.uri;
		if (!uri) return Promise.reject(createKeyLoadError(frag, ErrorDetails.KEY_LOAD_ERROR, /* @__PURE__ */ new Error(`Invalid key URI: "${uri}"`)));
		const cachedKeyInfo = this.keyLoaderInfo[uri];
		if (cachedKeyInfo) {
			if (cachedKeyInfo.decryptdata.key) {
				decryptdata.key = cachedKeyInfo.decryptdata.key;
				cachedKeyInfo.keyLoadPromise = null;
				return Promise.resolve({
					frag,
					keyInfo: cachedKeyInfo
				});
			}
			if (cachedKeyInfo.keyLoadPromise) return cachedKeyInfo.keyLoadPromise.then((keyLoadedData) => {
				decryptdata.key = cachedKeyInfo.decryptdata.key;
				return _objectSpread2(_objectSpread2({}, keyLoadedData), {}, { frag });
			});
		}
		this.log(`Loading${decryptdata.keyId ? " keyId: " + arrayToHex(decryptdata.keyId) : ""} URI: ${decryptdata.uri} from ${frag.type} ${frag.level}`);
		const config = this.config;
		const Loader = config.loader;
		const keyLoader = new Loader(config);
		frag.keyLoader = keyLoader;
		const keyInfo = this.keyLoaderInfo[uri] = {
			decryptdata,
			keyLoadPromise: null,
			loader: keyLoader
		};
		return keyInfo.keyLoadPromise = new Promise((resolve, reject) => {
			const loaderContext = {
				type: LoaderContextType.KEY,
				keyInfo,
				frag,
				responseType: "arraybuffer",
				url: uri
			};
			const loadPolicy = config.keyLoadPolicy.default;
			const loaderConfig = {
				loadPolicy,
				timeout: loadPolicy.maxLoadTimeMs,
				maxRetry: 0,
				retryDelay: 0,
				maxRetryDelay: 0
			};
			keyLoader.load(loaderContext, loaderConfig, {
				onSuccess: (response, stats, context, networkDetails) => {
					const { frag, keyInfo, url } = context;
					if (!frag.decryptdata || keyInfo !== this.keyLoaderInfo[url]) {
						this.resetLoader(context);
						return reject(createKeyLoadError(frag, ErrorDetails.KEY_LOAD_ERROR, /* @__PURE__ */ new Error("after key load, decryptdata unset or changed"), networkDetails));
					}
					keyInfo.decryptdata.key = frag.decryptdata.key = new Uint8Array(response.data);
					frag.keyLoader = keyInfo.loader = keyInfo.keyLoadPromise = null;
					resolve({
						frag,
						keyInfo
					});
				},
				onError: (response, context, networkDetails, stats) => {
					this.resetLoader(context);
					reject(createKeyLoadError(frag, ErrorDetails.KEY_LOAD_ERROR, /* @__PURE__ */ new Error(`HTTP Error ${response.code} loading key ${response.text}`), networkDetails, _objectSpread2({
						url: uri,
						data: void 0
					}, response)));
				},
				onTimeout: (stats, context, networkDetails) => {
					this.resetLoader(context);
					reject(createKeyLoadError(frag, ErrorDetails.KEY_LOAD_TIMEOUT, /* @__PURE__ */ new Error("key loading timed out"), networkDetails));
				},
				onAbort: (stats, context, networkDetails) => {
					this.resetLoader(context);
					reject(createKeyLoadError(frag, ErrorDetails.INTERNAL_ABORTED, /* @__PURE__ */ new Error("key loading aborted"), networkDetails));
				}
			});
		});
	}
	resetLoader(context) {
		const { frag, keyInfo, url } = context;
		const loader = keyInfo.loader;
		if (frag.keyLoader === loader) frag.keyLoader = keyInfo.loader = keyInfo.keyLoadPromise = null;
		delete this.keyLoaderInfo[url];
		if (loader) loader.destroy();
	}
};
function createKeyLoadError(frag, details = ErrorDetails.KEY_LOAD_ERROR, error, networkDetails, response) {
	return new LoadError({
		type: ErrorTypes.NETWORK_ERROR,
		details,
		fatal: false,
		frag,
		response,
		error,
		networkDetails: networkDetails || null
	});
}
function mapContextToLevelType(context) {
	const { type } = context;
	switch (type) {
		case LoaderContextType.AUDIO_TRACK: return PlaylistLevelType.AUDIO;
		case LoaderContextType.SUBTITLE_TRACK: return PlaylistLevelType.SUBTITLE;
		default: return PlaylistLevelType.MAIN;
	}
}
function getResponseUrl(response, context) {
	let url = response.url;
	if (url === void 0 || url.indexOf("data:") === 0) url = context.url;
	return url;
}
var PlaylistLoader = class {
	constructor(hls) {
		this.hls = void 0;
		this.loaders = Object.create(null);
		this.variableList = null;
		this.onManifestLoaded = this.checkAutostartLoad;
		this.hls = hls;
		this.registerListeners();
	}
	startLoad(startPosition) {}
	stopLoad() {
		this.destroyInternalLoaders();
	}
	registerListeners() {
		const { hls } = this;
		hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.on(Events.LEVEL_LOADING, this.onLevelLoading, this);
		hls.on(Events.AUDIO_TRACK_LOADING, this.onAudioTrackLoading, this);
		hls.on(Events.SUBTITLE_TRACK_LOADING, this.onSubtitleTrackLoading, this);
		hls.on(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
	}
	unregisterListeners() {
		const { hls } = this;
		hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
		hls.off(Events.LEVEL_LOADING, this.onLevelLoading, this);
		hls.off(Events.AUDIO_TRACK_LOADING, this.onAudioTrackLoading, this);
		hls.off(Events.SUBTITLE_TRACK_LOADING, this.onSubtitleTrackLoading, this);
		hls.off(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
	}
	/**
	* Returns defaults or configured loader-type overloads (pLoader and loader config params)
	*/
	createInternalLoader(context) {
		const config = this.hls.config;
		const PLoader = config.pLoader;
		const Loader = config.loader;
		const loader = new (PLoader || Loader)(config);
		this.loaders[context.type] = loader;
		return loader;
	}
	getInternalLoader(context) {
		return this.loaders[context.type];
	}
	resetInternalLoader(contextType) {
		if (this.loaders[contextType]) delete this.loaders[contextType];
	}
	/**
	* Call `destroy` on all internal loader instances mapped (one per context type)
	*/
	destroyInternalLoaders() {
		for (const contextType in this.loaders) {
			const loader = this.loaders[contextType];
			if (loader) loader.destroy();
			this.resetInternalLoader(contextType);
		}
	}
	destroy() {
		this.variableList = null;
		this.unregisterListeners();
		this.destroyInternalLoaders();
	}
	onManifestLoading(event, data) {
		const { url } = data;
		this.variableList = null;
		this.load({
			id: null,
			level: 0,
			responseType: "text",
			type: LoaderContextType.MANIFEST,
			url,
			deliveryDirectives: null,
			levelOrTrack: null
		});
	}
	onLevelLoading(event, data) {
		const { id, level, pathwayId, url, deliveryDirectives, levelInfo } = data;
		this.load({
			id,
			level,
			pathwayId,
			responseType: "text",
			type: LoaderContextType.LEVEL,
			url,
			deliveryDirectives,
			levelOrTrack: levelInfo
		});
	}
	onAudioTrackLoading(event, data) {
		const { id, groupId, url, deliveryDirectives, track } = data;
		this.load({
			id,
			groupId,
			level: null,
			responseType: "text",
			type: LoaderContextType.AUDIO_TRACK,
			url,
			deliveryDirectives,
			levelOrTrack: track
		});
	}
	onSubtitleTrackLoading(event, data) {
		const { id, groupId, url, deliveryDirectives, track } = data;
		this.load({
			id,
			groupId,
			level: null,
			responseType: "text",
			type: LoaderContextType.SUBTITLE_TRACK,
			url,
			deliveryDirectives,
			levelOrTrack: track
		});
	}
	onLevelsUpdated(event, data) {
		const loader = this.loaders[LoaderContextType.LEVEL];
		if (loader) {
			const context = loader.context;
			if (context && !data.levels.some((lvl) => lvl === context.levelOrTrack)) {
				loader.abort();
				delete this.loaders[LoaderContextType.LEVEL];
			}
		}
	}
	load(context) {
		var _context$deliveryDire;
		const config = this.hls.config;
		let loader = this.getInternalLoader(context);
		if (loader) {
			const logger = this.hls.logger;
			const loaderContext = loader.context;
			if ((loaderContext == null ? void 0 : loaderContext.levelOrTrack) === context.levelOrTrack && (loaderContext.url === context.url || loaderContext.deliveryDirectives && !context.deliveryDirectives)) {
				if (loaderContext.url === context.url) logger.log(`[playlist-loader]: ignore ${context.url} ongoing request`);
				else logger.log(`[playlist-loader]: ignore ${context.url} in favor of ${loaderContext.url}`);
				return;
			}
			logger.log(`[playlist-loader]: aborting previous loader for type: ${context.type}`);
			loader.abort();
		}
		let loadPolicy;
		if (context.type === LoaderContextType.MANIFEST) loadPolicy = config.manifestLoadPolicy.default;
		else loadPolicy = _extends({}, config.playlistLoadPolicy.default, {
			timeoutRetry: null,
			errorRetry: null
		});
		loader = this.createInternalLoader(context);
		if (isFiniteNumber((_context$deliveryDire = context.deliveryDirectives) == null ? void 0 : _context$deliveryDire.part)) {
			let levelDetails;
			if (context.type === LoaderContextType.LEVEL && context.level !== null) levelDetails = this.hls.levels[context.level].details;
			else if (context.type === LoaderContextType.AUDIO_TRACK && context.id !== null) levelDetails = this.hls.audioTracks[context.id].details;
			else if (context.type === LoaderContextType.SUBTITLE_TRACK && context.id !== null) levelDetails = this.hls.subtitleTracks[context.id].details;
			if (levelDetails) {
				const partTarget = levelDetails.partTarget;
				const targetDuration = levelDetails.targetduration;
				if (partTarget && targetDuration) {
					const maxLowLatencyPlaylistRefresh = Math.max(partTarget * 3, targetDuration * .8) * 1e3;
					loadPolicy = _extends({}, loadPolicy, {
						maxTimeToFirstByteMs: Math.min(maxLowLatencyPlaylistRefresh, loadPolicy.maxTimeToFirstByteMs),
						maxLoadTimeMs: Math.min(maxLowLatencyPlaylistRefresh, loadPolicy.maxTimeToFirstByteMs)
					});
				}
			}
		}
		const legacyRetryCompatibility = loadPolicy.errorRetry || loadPolicy.timeoutRetry || {};
		const loaderConfig = {
			loadPolicy,
			timeout: loadPolicy.maxLoadTimeMs,
			maxRetry: legacyRetryCompatibility.maxNumRetry || 0,
			retryDelay: legacyRetryCompatibility.retryDelayMs || 0,
			maxRetryDelay: legacyRetryCompatibility.maxRetryDelayMs || 0
		};
		loader.load(context, loaderConfig, {
			onSuccess: (response, stats, context, networkDetails) => {
				const loader = this.getInternalLoader(context);
				this.resetInternalLoader(context.type);
				const string = response.data;
				stats.parsing.start = performance.now();
				if (M3U8Parser.isMediaPlaylist(string) || context.type !== LoaderContextType.MANIFEST) this.handleTrackOrLevelPlaylist(response, stats, context, networkDetails || null, loader);
				else this.handleMasterPlaylist(response, stats, context, networkDetails);
			},
			onError: (response, context, networkDetails, stats) => {
				this.handleNetworkError(context, networkDetails, false, response, stats);
			},
			onTimeout: (stats, context, networkDetails) => {
				this.handleNetworkError(context, networkDetails, true, void 0, stats);
			}
		});
	}
	checkAutostartLoad() {
		if (!this.hls) return;
		const { config: { autoStartLoad, startPosition }, forceStartLoad } = this.hls;
		if (autoStartLoad || forceStartLoad) {
			this.hls.logger.log(`${autoStartLoad ? "auto" : "force"} startLoad with configured startPosition ${startPosition}`);
			this.hls.startLoad(startPosition);
		}
	}
	handleMasterPlaylist(response, stats, context, networkDetails) {
		const hls = this.hls;
		const string = response.data;
		const url = getResponseUrl(response, context);
		const parsedResult = M3U8Parser.parseMasterPlaylist(string, url);
		if (parsedResult.playlistParsingError) {
			stats.parsing.end = performance.now();
			this.handleManifestParsingError(response, context, parsedResult.playlistParsingError, networkDetails, stats);
			return;
		}
		const { contentSteering, levels, iframeVariants, sessionData, sessionKeys, startTimeOffset, variableList } = parsedResult;
		this.variableList = variableList;
		levels.forEach((levelParsed) => {
			const { unknownCodecs } = levelParsed;
			if (unknownCodecs) {
				const { preferManagedMediaSource } = this.hls.config;
				let { audioCodec, videoCodec } = levelParsed;
				for (let i = unknownCodecs.length; i--;) {
					const unknownCodec = unknownCodecs[i];
					if (areCodecsMediaSourceSupported(unknownCodec, "audio", preferManagedMediaSource)) {
						levelParsed.audioCodec = audioCodec = audioCodec ? `${audioCodec},${unknownCodec}` : unknownCodec;
						sampleEntryCodesISO.audio[audioCodec.substring(0, 4)] = 2;
						unknownCodecs.splice(i, 1);
					} else if (areCodecsMediaSourceSupported(unknownCodec, "video", preferManagedMediaSource)) {
						levelParsed.videoCodec = videoCodec = videoCodec ? `${videoCodec},${unknownCodec}` : unknownCodec;
						sampleEntryCodesISO.video[videoCodec.substring(0, 4)] = 2;
						unknownCodecs.splice(i, 1);
					}
				}
			}
		});
		const { AUDIO: audioTracks = [], SUBTITLES: subtitles, "CLOSED-CAPTIONS": captions } = M3U8Parser.parseMasterPlaylistMedia(string, url, parsedResult);
		if (audioTracks.length) {
			if (!audioTracks.some((audioTrack) => !audioTrack.url) && levels[0].audioCodec && !levels[0].attrs.AUDIO) {
				this.hls.logger.log("[playlist-loader]: audio codec signaled in quality level, but no embedded audio track signaled, create one");
				audioTracks.unshift({
					type: "main",
					name: "main",
					groupId: "main",
					default: false,
					autoselect: false,
					forced: false,
					id: -1,
					attrs: new AttrList({}),
					bitrate: 0,
					url: ""
				});
			}
		}
		hls.trigger(Events.MANIFEST_LOADED, {
			levels,
			audioTracks,
			subtitles,
			iframeVariants,
			captions,
			contentSteering,
			url,
			stats,
			networkDetails,
			sessionData,
			sessionKeys,
			startTimeOffset,
			variableList
		});
	}
	handleTrackOrLevelPlaylist(response, stats, context, networkDetails, loader) {
		const hls = this.hls;
		const { id, level, type } = context;
		const url = getResponseUrl(response, context);
		const levelId = isFiniteNumber(level) ? level : isFiniteNumber(id) ? id : 0;
		const levelType = mapContextToLevelType(context);
		const levelDetails = M3U8Parser.parseLevelPlaylist(response.data, url, levelId, levelType, 0, this.variableList);
		if (type === LoaderContextType.MANIFEST) {
			const singleLevel = {
				attrs: new AttrList({}),
				bitrate: 0,
				details: levelDetails,
				name: "",
				url
			};
			levelDetails.requestScheduled = stats.loading.start + computeReloadInterval(levelDetails, 0);
			hls.trigger(Events.MANIFEST_LOADED, {
				levels: [singleLevel],
				audioTracks: [],
				iframeVariants: [],
				url,
				stats,
				networkDetails,
				sessionData: null,
				sessionKeys: null,
				contentSteering: null,
				startTimeOffset: null,
				variableList: null
			});
		}
		stats.parsing.end = performance.now();
		context.levelDetails = levelDetails;
		this.handlePlaylistLoaded(levelDetails, response, stats, context, networkDetails, loader);
	}
	handleManifestParsingError(response, context, error, networkDetails, stats) {
		this.hls.trigger(Events.ERROR, {
			type: ErrorTypes.NETWORK_ERROR,
			details: ErrorDetails.MANIFEST_PARSING_ERROR,
			fatal: context.type === LoaderContextType.MANIFEST,
			url: response.url,
			err: error,
			error,
			reason: error.message,
			response,
			context,
			networkDetails,
			stats
		});
	}
	handleNetworkError(context, networkDetails, timeout = false, response, stats) {
		let message = `A network ${timeout ? "timeout" : "error" + (response ? " (status " + response.code + ")" : "")} occurred while loading ${context.type}`;
		if (context.type === LoaderContextType.LEVEL) message += `: ${context.level} id: ${context.id}`;
		else if (context.type === LoaderContextType.AUDIO_TRACK || context.type === LoaderContextType.SUBTITLE_TRACK) message += ` id: ${context.id} group-id: "${context.groupId}"`;
		const error = new Error(message);
		this.hls.logger.warn(`[playlist-loader]: ${message}`);
		let details = ErrorDetails.UNKNOWN;
		let fatal = false;
		const loader = this.getInternalLoader(context);
		switch (context.type) {
			case LoaderContextType.MANIFEST:
				details = timeout ? ErrorDetails.MANIFEST_LOAD_TIMEOUT : ErrorDetails.MANIFEST_LOAD_ERROR;
				fatal = true;
				break;
			case LoaderContextType.LEVEL:
				details = timeout ? ErrorDetails.LEVEL_LOAD_TIMEOUT : ErrorDetails.LEVEL_LOAD_ERROR;
				fatal = false;
				break;
			case LoaderContextType.AUDIO_TRACK:
				details = timeout ? ErrorDetails.AUDIO_TRACK_LOAD_TIMEOUT : ErrorDetails.AUDIO_TRACK_LOAD_ERROR;
				fatal = false;
				break;
			case LoaderContextType.SUBTITLE_TRACK:
				details = timeout ? ErrorDetails.SUBTITLE_TRACK_LOAD_TIMEOUT : ErrorDetails.SUBTITLE_LOAD_ERROR;
				fatal = false;
		}
		if (loader) this.resetInternalLoader(context.type);
		const errorData = {
			type: ErrorTypes.NETWORK_ERROR,
			details,
			fatal,
			url: context.url,
			loader,
			context,
			error,
			networkDetails,
			stats
		};
		if (response) {
			let url = context.url;
			if (networkDetails && "url" in networkDetails) url = networkDetails.url;
			errorData.response = _objectSpread2({
				url,
				data: void 0
			}, response);
		}
		this.hls.trigger(Events.ERROR, errorData);
	}
	handlePlaylistLoaded(levelDetails, response, stats, context, networkDetails, loader) {
		const hls = this.hls;
		const { type, level, levelOrTrack, id, groupId, deliveryDirectives } = context;
		const url = getResponseUrl(response, context);
		const parent = mapContextToLevelType(context);
		let levelIndex = typeof context.level === "number" && parent === PlaylistLevelType.MAIN ? level : void 0;
		const error = levelDetails.playlistParsingError;
		if (error) {
			this.hls.logger.warn(`${error} ${levelDetails.url}`);
			if (!hls.config.ignorePlaylistParsingErrors) {
				hls.trigger(Events.ERROR, {
					type: ErrorTypes.NETWORK_ERROR,
					details: ErrorDetails.LEVEL_PARSING_ERROR,
					fatal: false,
					url,
					error,
					reason: error.message,
					response,
					context,
					level: levelIndex,
					parent,
					networkDetails,
					stats
				});
				return;
			}
			levelDetails.playlistParsingError = null;
		}
		if (!levelDetails.fragments.length) {
			const _error = levelDetails.playlistParsingError = /* @__PURE__ */ new Error("No Segments found in Playlist");
			hls.trigger(Events.ERROR, {
				type: ErrorTypes.NETWORK_ERROR,
				details: ErrorDetails.LEVEL_EMPTY_ERROR,
				fatal: false,
				url,
				error: _error,
				reason: _error.message,
				response,
				context,
				level: levelIndex,
				parent,
				networkDetails,
				stats
			});
			return;
		}
		if (levelDetails.live && loader) {
			if (loader.getCacheAge) levelDetails.ageHeader = loader.getCacheAge() || 0;
			if (!loader.getCacheAge || isNaN(levelDetails.ageHeader)) levelDetails.ageHeader = 0;
		}
		switch (type) {
			case LoaderContextType.MANIFEST:
			case LoaderContextType.LEVEL:
				if (levelIndex) {
					if (!levelOrTrack) levelIndex = 0;
					else if (levelOrTrack !== hls.levels[levelIndex]) {
						const updatedIndex = hls.levels.indexOf(levelOrTrack);
						if (updatedIndex > -1) levelIndex = updatedIndex;
					}
				}
				hls.trigger(Events.LEVEL_LOADED, {
					details: levelDetails,
					levelInfo: levelOrTrack || hls.levels[0],
					level: levelIndex || 0,
					id: id || 0,
					stats,
					networkDetails,
					deliveryDirectives,
					withoutMultiVariant: type === LoaderContextType.MANIFEST,
					context
				});
				break;
			case LoaderContextType.AUDIO_TRACK:
				hls.trigger(Events.AUDIO_TRACK_LOADED, {
					details: levelDetails,
					track: levelOrTrack,
					id: id || 0,
					groupId: groupId || "",
					stats,
					networkDetails,
					deliveryDirectives,
					context
				});
				break;
			case LoaderContextType.SUBTITLE_TRACK: hls.trigger(Events.SUBTITLE_TRACK_LOADED, {
				details: levelDetails,
				track: levelOrTrack,
				id: id || 0,
				groupId: groupId || "",
				stats,
				networkDetails,
				deliveryDirectives,
				context
			});
		}
	}
};
/**
* The `Hls` class is the core of the HLS.js library used to instantiate player instances.
* @public
*/
var Hls = class Hls {
	/**
	* Get the video-dev/hls.js package version.
	*/
	static get version() {
		return version;
	}
	/**
	* Check if the required MediaSource Extensions are available.
	*/
	static isMSESupported() {
		return isMSESupported();
	}
	/**
	* Check if MediaSource Extensions are available and isTypeSupported checks pass for any baseline codecs.
	*/
	static isSupported() {
		return isSupported();
	}
	/**
	* Get the MediaSource global used for MSE playback (ManagedMediaSource, MediaSource, or WebKitMediaSource).
	*/
	static getMediaSource() {
		return getMediaSource();
	}
	static get Events() {
		return Events;
	}
	static get MetadataSchema() {
		return MetadataSchema;
	}
	static get ErrorTypes() {
		return ErrorTypes;
	}
	static get ErrorDetails() {
		return ErrorDetails;
	}
	/**
	* Get the default configuration applied to new instances.
	*/
	static get DefaultConfig() {
		if (!Hls.defaultConfig) return hlsDefaultConfig;
		return Hls.defaultConfig;
	}
	/**
	* Replace the default configuration applied to new instances.
	*/
	static set DefaultConfig(defaultConfig) {
		Hls.defaultConfig = defaultConfig;
	}
	/**
	* Creates an instance of an HLS client that can attach to exactly one `HTMLMediaElement`.
	* @param userConfig - Configuration options applied over `Hls.DefaultConfig`
	*/
	constructor(userConfig = {}) {
		/**
		* The runtime configuration used by the player. At instantiation this is combination of `hls.userConfig` merged over `Hls.DefaultConfig`.
		*/
		this.config = void 0;
		/**
		* The configuration object provided on player instantiation.
		*/
		this.userConfig = void 0;
		/**
		* The logger functions used by this player instance, configured on player instantiation.
		*/
		this.logger = void 0;
		this._url = null;
		this.streamController = void 0;
		this.coreComponents = void 0;
		this.networkControllers = void 0;
		this._emitter = new EventEmitter();
		this._autoLevelCapping = -1;
		this._maxHdcpLevel = null;
		this.abrController = void 0;
		this.bufferController = void 0;
		this.capLevelController = void 0;
		this.latencyController = void 0;
		this.levelController = void 0;
		this.audioStreamController = void 0;
		this.subtititleStreamController = void 0;
		this.audioTrackController = void 0;
		this.subtitleTrackController = void 0;
		this.interstitialsController = void 0;
		this.iframeController = void 0;
		this.gapController = void 0;
		this.emeController = void 0;
		this.cmcdController = void 0;
		this._media = null;
		this._sessionId = void 0;
		this.triggeringException = void 0;
		this.started = false;
		const logger = this.logger = enableLogs(userConfig.debug || false, "Hls instance", userConfig.loggerId || userConfig.assetPlayerId);
		const config = this.config = mergeConfig(Hls.DefaultConfig, userConfig, logger);
		this.userConfig = userConfig;
		if (config.progressive) enableStreamingMode(config, logger);
		const { streamController: _StreamController, abrController: _AbrController, bufferController: _BufferController, capLevelController: _CapLevelController, errorController: _ErrorController, fpsController: _FpsController, id3TrackController: _ID3TrackController, iframeController: _IFrameController, gapController: _GapController } = config;
		const errorController = new _ErrorController(this);
		const abrController = this.abrController = new _AbrController(this);
		const fragmentTracker = new FragmentTracker(this);
		const _InterstitialsController = config.interstitialsController;
		const interstitialsController = _InterstitialsController ? this.interstitialsController = new _InterstitialsController(this, Hls) : null;
		const bufferController = _BufferController ? this.bufferController = new _BufferController(this, fragmentTracker) : null;
		const capLevelController = _CapLevelController ? this.capLevelController = new _CapLevelController(this) : null;
		const fpsController = _FpsController ? new _FpsController(this) : null;
		const _CMCDController = config.cmcdController;
		const cmcdController = _CMCDController ? this.cmcdController = new _CMCDController(this) : null;
		const playListLoader = new PlaylistLoader(this);
		const _ContentSteeringController = config.contentSteeringController;
		const contentSteering = _ContentSteeringController ? new _ContentSteeringController(this) : null;
		const levelController = this.levelController = new LevelController(this, contentSteering);
		const id3TrackController = _ID3TrackController ? new _ID3TrackController(this) : void 0;
		const keyLoader = new KeyLoader(this.config, this.logger);
		const streamController = this.streamController = new _StreamController(this, fragmentTracker, keyLoader);
		const gapController = this.gapController = _GapController ? new _GapController(this, fragmentTracker) : void 0;
		if (capLevelController) capLevelController.setStreamController(streamController);
		const networkControllers = [
			playListLoader,
			levelController,
			streamController
		];
		if (interstitialsController) networkControllers.splice(1, 0, interstitialsController);
		if (contentSteering) networkControllers.splice(1, 0, contentSteering);
		this.networkControllers = networkControllers;
		const coreComponents = [abrController];
		if (bufferController) coreComponents.push(bufferController);
		if (gapController) coreComponents.push(gapController);
		if (capLevelController) coreComponents.push(capLevelController);
		if (fpsController) {
			fpsController.setStreamController(streamController);
			coreComponents.push(fpsController);
		}
		if (id3TrackController) coreComponents.push(id3TrackController);
		coreComponents.push(fragmentTracker);
		this.audioTrackController = this.createController(config.audioTrackController, networkControllers);
		const AudioStreamControllerClass = config.audioStreamController;
		if (AudioStreamControllerClass) networkControllers.push(this.audioStreamController = new AudioStreamControllerClass(this, fragmentTracker, keyLoader));
		this.subtitleTrackController = this.createController(config.subtitleTrackController, networkControllers);
		const SubtitleStreamControllerClass = config.subtitleStreamController;
		if (SubtitleStreamControllerClass) networkControllers.push(this.subtititleStreamController = new SubtitleStreamControllerClass(this, fragmentTracker, keyLoader));
		this.createController(config.timelineController, coreComponents);
		keyLoader.emeController = this.emeController = this.createController(config.emeController, coreComponents);
		if (cmcdController) coreComponents.push(cmcdController);
		this.latencyController = this.createController(config.latencyController, coreComponents);
		this.coreComponents = coreComponents;
		this.iframeController = _IFrameController ? new _IFrameController(this, Hls) : void 0;
		networkControllers.push(errorController);
		const onErrorOut = errorController.onErrorOut;
		if (typeof onErrorOut === "function") this.on(Events.ERROR, onErrorOut, errorController);
		this.on(Events.MANIFEST_LOADED, playListLoader.onManifestLoaded, playListLoader);
	}
	createController(ControllerClass, components) {
		if (ControllerClass) {
			const controllerInstance = new ControllerClass(this);
			if (components) components.push(controllerInstance);
			return controllerInstance;
		}
		return null;
	}
	on(event, listener, context = this) {
		this._emitter.on(event, listener, context);
	}
	once(event, listener, context = this) {
		this._emitter.once(event, listener, context);
	}
	removeAllListeners(event) {
		this._emitter.removeAllListeners(event);
	}
	off(event, listener, context = this, once) {
		this._emitter.off(event, listener, context, once);
	}
	listeners(event) {
		return this._emitter.listeners(event);
	}
	emit(event, name, eventObject) {
		return this._emitter.emit(event, name, eventObject);
	}
	trigger(event, eventObject) {
		if (this.config.debug) return this.emit(event, event, eventObject);
		else try {
			return this.emit(event, event, eventObject);
		} catch (error) {
			this.logger.error("An internal error happened while handling event " + event + ". Error message: \"" + error.message + "\". Here is a stacktrace:", error);
			if (!this.triggeringException) {
				this.triggeringException = true;
				const fatal = event === Events.ERROR;
				this.trigger(Events.ERROR, {
					type: ErrorTypes.OTHER_ERROR,
					details: ErrorDetails.INTERNAL_EXCEPTION,
					fatal,
					event,
					error
				});
				this.triggeringException = false;
			}
		}
		return false;
	}
	listenerCount(event) {
		return this._emitter.listenerCount(event);
	}
	/**
	* Dispose of the instance
	*/
	destroy() {
		this.logger.log("destroy");
		this.trigger(Events.DESTROYING, void 0);
		this.detachMedia();
		this.removeAllListeners();
		this._autoLevelCapping = -1;
		this._url = null;
		this.networkControllers.forEach((component) => component.destroy());
		this.networkControllers.length = 0;
		this.coreComponents.forEach((component) => component.destroy());
		this.coreComponents.length = 0;
		this.iframeController = void 0;
		const config = this.config;
		config.xhrSetup = config.fetchSetup = void 0;
		this.userConfig = null;
	}
	/**
	* Attaches Hls.js to a media element
	*/
	attachMedia(data) {
		if (!data || "media" in data && !data.media) {
			const error = /* @__PURE__ */ new Error(`attachMedia failed: invalid argument (${data})`);
			this.trigger(Events.ERROR, {
				type: ErrorTypes.OTHER_ERROR,
				details: ErrorDetails.ATTACH_MEDIA_ERROR,
				fatal: true,
				error
			});
			return;
		}
		this.logger.log(`attachMedia`);
		if (this._media) {
			this.logger.warn(`media must be detached before attaching`);
			this.detachMedia();
		}
		const attachMediaSource = "media" in data;
		const media = attachMediaSource ? data.media : data;
		const attachingData = attachMediaSource ? data : { media };
		this._media = media;
		this.trigger(Events.MEDIA_ATTACHING, attachingData);
	}
	/**
	* Detach Hls.js from the media
	*/
	detachMedia() {
		this.logger.log("detachMedia");
		const data = {};
		this.trigger(Events.MEDIA_DETACHING, data);
		this._media = null;
		this.trigger(Events.MEDIA_DETACHED, data);
	}
	/**
	* Detach HTMLMediaElement, MediaSource, and SourceBuffers without reset, for attaching to another instance
	*/
	transferMedia() {
		var _this$bufferControlle;
		this._media = null;
		const transferMedia = ((_this$bufferControlle = this.bufferController) == null ? void 0 : _this$bufferControlle.transferMedia()) || null;
		const data = { transferMedia };
		this.trigger(Events.MEDIA_DETACHING, data);
		this.trigger(Events.MEDIA_DETACHED, data);
		return transferMedia;
	}
	/**
	* Set the source URL. Can be relative or absolute.
	*/
	loadSource(url) {
		var _this$bufferControlle2;
		this.stopLoad();
		const media = this.media;
		const loadedSource = this._url;
		const loadingSource = this._url = urlToolkitExports.buildAbsoluteURL(self.location.href, url, { alwaysNormalize: true });
		this._autoLevelCapping = -1;
		this._maxHdcpLevel = null;
		this.logger.log(`loadSource:${loadingSource}`);
		if (media && loadedSource && (loadedSource !== loadingSource || (_this$bufferControlle2 = this.bufferController) != null && _this$bufferControlle2.hasSourceTypes())) {
			this.detachMedia();
			this.attachMedia(media);
		}
		this.trigger(Events.MANIFEST_LOADING, { url });
	}
	/**
	* Gets the currently loaded URL
	*/
	get url() {
		return this._url;
	}
	/**
	* Whether or not enough has been buffered to seek to start position or use `media.currentTime` to determine next load position
	*/
	get hasEnoughToStart() {
		return this.streamController.hasEnoughToStart;
	}
	/**
	* Get the startPosition set on startLoad(position) or on autostart with config.startPosition
	*/
	get startPosition() {
		return this.streamController.startPositionValue;
	}
	/**
	* Start loading data from the stream source.
	* Depending on default config, client starts loading automatically when a source is set.
	*
	* @param startPosition - Set the start position to stream from.
	* Defaults to -1 (None: starts from earliest point)
	*/
	startLoad(startPosition = -1, skipSeekToStartPosition) {
		this.logger.log(`startLoad(${startPosition + (skipSeekToStartPosition ? ", <skip seek to start>" : "")})`);
		this.started = true;
		this.resumeBuffering();
		for (let i = 0; i < this.networkControllers.length; i++) {
			this.networkControllers[i].startLoad(startPosition, skipSeekToStartPosition);
			if (!this.started || !this.networkControllers) break;
		}
	}
	/**
	* Stop loading of any stream data.
	*/
	stopLoad() {
		this.logger.log("stopLoad");
		this.started = false;
		for (let i = 0; i < this.networkControllers.length; i++) {
			this.networkControllers[i].stopLoad();
			if (this.started || !this.networkControllers) break;
		}
	}
	/**
	* Returns whether loading, toggled with `startLoad()` and `stopLoad()`, is active or not`.
	*/
	get loadingEnabled() {
		return this.started && this.streamController.state !== State.STOPPED;
	}
	/**
	* Returns state of fragment loading toggled by calling `pauseBuffering()` and `resumeBuffering()`.
	*/
	get bufferingEnabled() {
		return this.streamController.bufferingEnabled;
	}
	/**
	* Resumes stream controller segment loading after `pauseBuffering` has been called.
	*/
	resumeBuffering() {
		if (!this.bufferingEnabled) {
			this.logger.log(`resume buffering`);
			this.networkControllers.forEach((controller) => {
				if (controller.resumeBuffering) controller.resumeBuffering();
			});
		}
	}
	/**
	* Prevents stream controller from loading new segments until `resumeBuffering` is called.
	* This allows for media buffering to be paused without interupting playlist loading.
	*/
	pauseBuffering() {
		if (this.bufferingEnabled) {
			this.logger.log(`pause buffering`);
			this.networkControllers.forEach((controller) => {
				if (controller.pauseBuffering) controller.pauseBuffering();
			});
		}
	}
	get inFlightFragments() {
		const inFlightData = { [PlaylistLevelType.MAIN]: this.streamController.inFlightFrag };
		if (this.audioStreamController) inFlightData[PlaylistLevelType.AUDIO] = this.audioStreamController.inFlightFrag;
		if (this.subtititleStreamController) inFlightData[PlaylistLevelType.SUBTITLE] = this.subtititleStreamController.inFlightFrag;
		return inFlightData;
	}
	/**
	* Swap through possible audio codecs in the stream (for example to switch from stereo to 5.1)
	*/
	swapAudioCodec() {
		this.logger.log("swapAudioCodec");
		this.streamController.swapAudioCodec();
	}
	/**
	* When the media-element fails, this allows to detach and then re-attach it
	* as one call (convenience method).
	*
	* Automatic recovery of media-errors by this process is configurable.
	*/
	recoverMediaError() {
		this.logger.log("recoverMediaError");
		const media = this._media;
		const started = this.started;
		const time = media == null ? void 0 : media.currentTime;
		this.detachMedia();
		if (media) {
			this.attachMedia(media);
			if (started) {
				if (time) this.startLoad(time);
				else if (!this.config.autoStartLoad) this.startLoad();
			}
		}
	}
	removeLevel(levelIndex) {
		this.levelController.removeLevel(levelIndex);
	}
	/**
	* @returns a UUID for this player instance
	*/
	get sessionId() {
		let _sessionId = this._sessionId;
		if (!_sessionId) _sessionId = this._sessionId = uuid();
		return _sessionId;
	}
	/**
	* @returns an array of levels (variants) sorted by HDCP-LEVEL, RESOLUTION (height), FRAME-RATE, CODECS, VIDEO-RANGE, and BANDWIDTH
	*/
	get levels() {
		const levels = this.levelController.levels;
		return levels ? levels : [];
	}
	/**
	* @returns LevelDetails of last loaded level (variant) or `null` prior to loading a media playlist.
	*/
	get latestLevelDetails() {
		return this.streamController.getLevelDetails() || null;
	}
	/**
	* @returns Level object of selected level (variant) or `null` prior to selecting a level or once the level is removed.
	*/
	get loadLevelObj() {
		return this.levelController.loadLevelObj;
	}
	/**
	* Index of quality level (variant) currently played
	*/
	get currentLevel() {
		return this.streamController.currentLevel;
	}
	/**
	* Set quality level index immediately. This will flush the current buffer to replace the quality asap. That means playback will interrupt at least shortly to re-buffer and re-sync eventually. Set to -1 for automatic level selection.
	*/
	set currentLevel(newLevel) {
		this.logger.log(`set currentLevel:${newLevel}`);
		this.levelController.manualLevel = newLevel;
		this.streamController.immediateLevelSwitch();
	}
	/**
	* Index of next quality level loaded as scheduled by stream controller.
	*/
	get nextLevel() {
		return this.streamController.nextLevel;
	}
	/**
	* Set quality level index for next loaded data.
	* This will switch the video quality asap, without interrupting playback.
	* May abort current loading of data, and flush parts of buffer (outside currently played fragment region).
	* @param newLevel - Pass -1 for automatic level selection
	*/
	set nextLevel(newLevel) {
		this.logger.log(`set nextLevel:${newLevel}`);
		this.levelController.manualLevel = newLevel;
		this.streamController.nextLevelSwitch();
	}
	/**
	* Return the quality level of the currently or last (of none is loaded currently) segment
	*/
	get loadLevel() {
		return this.levelController.level;
	}
	/**
	* Set quality level index for next loaded data in a conservative way.
	* This will switch the quality without flushing, but interrupt current loading.
	* Thus the moment when the quality switch will appear in effect will only be after the already existing buffer.
	* @param newLevel - Pass -1 for automatic level selection
	*/
	set loadLevel(newLevel) {
		this.logger.log(`set loadLevel:${newLevel}`);
		this.levelController.manualLevel = newLevel;
	}
	/**
	* get next quality level loaded
	*/
	get nextLoadLevel() {
		return this.levelController.nextLoadLevel;
	}
	/**
	* Set quality level of next loaded segment in a fully "non-destructive" way.
	* Same as `loadLevel` but will wait for next switch (until current loading is done).
	*/
	set nextLoadLevel(level) {
		this.levelController.nextLoadLevel = level;
	}
	/**
	* Return "first level": like a default level, if not set,
	* falls back to index of first level referenced in manifest
	*/
	get firstLevel() {
		return Math.max(this.levelController.firstLevel, this.minAutoLevel);
	}
	/**
	* Sets "first-level", see getter.
	*/
	set firstLevel(newLevel) {
		this.logger.log(`set firstLevel:${newLevel}`);
		this.levelController.firstLevel = newLevel;
	}
	/**
	* Return the desired start level for the first fragment that will be loaded.
	* The default value of -1 indicates automatic start level selection.
	* Setting hls.nextAutoLevel without setting a startLevel will result in
	* the nextAutoLevel value being used for one fragment load.
	*/
	get startLevel() {
		const startLevel = this.levelController.startLevel;
		if (startLevel === -1 && this.abrController.forcedAutoLevel > -1) return this.abrController.forcedAutoLevel;
		return startLevel;
	}
	/**
	* set  start level (level of first fragment that will be played back)
	* if not overrided by user, first level appearing in manifest will be used as start level
	* if -1 : automatic start level selection, playback will start from level matching download bandwidth
	* (determined from download of first segment)
	*/
	set startLevel(newLevel) {
		this.logger.log(`set startLevel:${newLevel}`);
		if (newLevel !== -1) newLevel = Math.max(newLevel, this.minAutoLevel);
		this.levelController.startLevel = newLevel;
	}
	/**
	* Whether level capping is enabled.
	* Default value is set via `config.capLevelToPlayerSize`.
	*/
	get capLevelToPlayerSize() {
		return this.config.capLevelToPlayerSize;
	}
	/**
	* Enables or disables level capping. If disabled after previously enabled, `nextLevelSwitch` will be immediately called.
	*/
	set capLevelToPlayerSize(shouldStartCapping) {
		const capLevelController = this.capLevelController;
		const newCapLevelToPlayerSize = !!shouldStartCapping;
		if (capLevelController && newCapLevelToPlayerSize !== this.config.capLevelToPlayerSize) {
			if (newCapLevelToPlayerSize) capLevelController.startCapping();
			else {
				capLevelController.stopCapping();
				this.autoLevelCapping = -1;
				this.streamController.nextLevelSwitch();
			}
			this.config.capLevelToPlayerSize = newCapLevelToPlayerSize;
		}
	}
	/**
	* Capping/max level value that should be used by automatic level selection algorithm (`ABRController`)
	*/
	get autoLevelCapping() {
		return this._autoLevelCapping;
	}
	/**
	* Returns the current bandwidth estimate in bits per second, when available. Otherwise, `NaN` is returned.
	*/
	get bandwidthEstimate() {
		const { bwEstimator } = this.abrController;
		if (!bwEstimator) return NaN;
		return bwEstimator.getEstimate();
	}
	set bandwidthEstimate(abrEwmaDefaultEstimate) {
		this.abrController.resetEstimator(abrEwmaDefaultEstimate);
	}
	get abrEwmaDefaultEstimate() {
		const { bwEstimator } = this.abrController;
		if (!bwEstimator) return NaN;
		return bwEstimator.defaultEstimate;
	}
	/**
	* get time to first byte estimate
	* @type {number}
	*/
	get ttfbEstimate() {
		const { bwEstimator } = this.abrController;
		if (!bwEstimator) return NaN;
		return bwEstimator.getEstimateTTFB();
	}
	/**
	* Capping/max level value that should be used by automatic level selection algorithm (`ABRController`)
	*/
	set autoLevelCapping(newLevel) {
		if (this._autoLevelCapping !== newLevel) {
			this.logger.log(`set autoLevelCapping:${newLevel}`);
			this._autoLevelCapping = newLevel;
			this.levelController.checkMaxAutoUpdated();
		}
	}
	get maxHdcpLevel() {
		return this._maxHdcpLevel;
	}
	set maxHdcpLevel(value) {
		if (isHdcpLevel(value) && this._maxHdcpLevel !== value) {
			this._maxHdcpLevel = value;
			this.levelController.checkMaxAutoUpdated();
		}
	}
	/**
	* True when automatic level selection enabled
	*/
	get autoLevelEnabled() {
		return this.levelController.manualLevel === -1;
	}
	/**
	* Level set manually (if any)
	*/
	get manualLevel() {
		return this.levelController.manualLevel;
	}
	/**
	* min level selectable in auto mode according to config.minAutoBitrate
	*/
	get minAutoLevel() {
		const { levels, config: { minAutoBitrate } } = this;
		if (!levels) return 0;
		const len = levels.length;
		for (let i = 0; i < len; i++) if (levels[i].maxBitrate >= minAutoBitrate) return i;
		return 0;
	}
	/**
	* max level selectable in auto mode according to autoLevelCapping
	*/
	get maxAutoLevel() {
		const { levels, autoLevelCapping, maxHdcpLevel } = this;
		let maxAutoLevel;
		if (autoLevelCapping === -1 && levels != null && levels.length) maxAutoLevel = levels.length - 1;
		else maxAutoLevel = autoLevelCapping;
		if (maxHdcpLevel) for (let i = maxAutoLevel; i--;) {
			const hdcpLevel = levels[i].attrs["HDCP-LEVEL"];
			if (hdcpLevel && hdcpLevel <= maxHdcpLevel) return i;
		}
		return maxAutoLevel;
	}
	get firstAutoLevel() {
		return this.abrController.firstAutoLevel;
	}
	/**
	* next automatically selected quality level
	*/
	get nextAutoLevel() {
		return this.abrController.nextAutoLevel;
	}
	/**
	* this setter is used to force next auto level.
	* this is useful to force a switch down in auto mode:
	* in case of load error on level N, hls.js can set nextAutoLevel to N-1 for example)
	* forced value is valid for one fragment. upon successful frag loading at forced level,
	* this value will be resetted to -1 by ABR controller.
	*/
	set nextAutoLevel(nextLevel) {
		this.abrController.nextAutoLevel = nextLevel;
	}
	/**
	* get the datetime value relative to media.currentTime for the active level Program Date Time if present
	*/
	get playingDate() {
		return this.streamController.currentProgramDateTime;
	}
	get mainForwardBufferInfo() {
		return this.streamController.getMainFwdBufferInfo();
	}
	get audioForwardBufferInfo() {
		var _this$audioStreamCont;
		return ((_this$audioStreamCont = this.audioStreamController) == null ? void 0 : _this$audioStreamCont.getFwdBufferInfo()) || null;
	}
	get maxBufferLength() {
		return this.streamController.maxBufferLength;
	}
	/**
	* Find and select the best matching audio track, making a level switch when a Group change is necessary.
	* Updates `hls.config.audioPreference`. Returns the selected track, or null when no matching track is found.
	*/
	setAudioOption(audioOption) {
		var _this$audioTrackContr;
		return ((_this$audioTrackContr = this.audioTrackController) == null ? void 0 : _this$audioTrackContr.setAudioOption(audioOption)) || null;
	}
	/**
	* Find and select the best matching subtitle track, making a level switch when a Group change is necessary.
	* Updates `hls.config.subtitlePreference`. Returns the selected track, or null when no matching track is found.
	*/
	setSubtitleOption(subtitleOption) {
		var _this$subtitleTrackCo;
		return ((_this$subtitleTrackCo = this.subtitleTrackController) == null ? void 0 : _this$subtitleTrackCo.setSubtitleOption(subtitleOption)) || null;
	}
	/**
	* Get the complete list of audio tracks across all media groups
	*/
	get allAudioTracks() {
		const audioTrackController = this.audioTrackController;
		return audioTrackController ? audioTrackController.allAudioTracks : [];
	}
	/**
	* Get the list of selectable audio tracks
	*/
	get audioTracks() {
		const audioTrackController = this.audioTrackController;
		return audioTrackController ? audioTrackController.audioTracks : [];
	}
	/**
	* index of the selected audio track (index in audio track lists)
	*/
	get audioTrack() {
		const audioTrackController = this.audioTrackController;
		return audioTrackController ? audioTrackController.audioTrack : -1;
	}
	/**
	* selects an audio track, based on its index in audio track lists
	*/
	set audioTrack(audioTrackId) {
		const audioTrackController = this.audioTrackController;
		if (audioTrackController) audioTrackController.audioTrack = audioTrackId;
	}
	/**
	* Index of next audio track as scheduled by audio stream controller.
	*/
	get nextAudioTrack() {
		var _this$audioStreamCont2, _this$audioStreamCont3;
		return (_this$audioStreamCont2 = (_this$audioStreamCont3 = this.audioStreamController) == null ? void 0 : _this$audioStreamCont3.nextAudioTrack) != null ? _this$audioStreamCont2 : -1;
	}
	/**
	* Set audio track index for next loaded data.
	* This will switch the audio track asap, without interrupting playback.
	* May abort current loading of data, and flush parts of buffer(outside
	* currently played fragment region). Audio Track Switched event will be
	* delayed until the currently playing fragment is of the next audio track.
	* @param audioTrackId - Pass -1 for automatic level selection
	*/
	set nextAudioTrack(audioTrackId) {
		const { audioTrackController } = this;
		if (audioTrackController) audioTrackController.nextAudioTrack = audioTrackId;
	}
	/**
	* get the complete list of subtitle tracks across all media groups
	*/
	get allSubtitleTracks() {
		const subtitleTrackController = this.subtitleTrackController;
		return subtitleTrackController ? subtitleTrackController.allSubtitleTracks : [];
	}
	/**
	* get alternate subtitle tracks list from playlist
	*/
	get subtitleTracks() {
		const subtitleTrackController = this.subtitleTrackController;
		return subtitleTrackController ? subtitleTrackController.subtitleTracks : [];
	}
	/**
	* index of the selected subtitle track (index in subtitle track lists)
	*/
	get subtitleTrack() {
		const subtitleTrackController = this.subtitleTrackController;
		return subtitleTrackController ? subtitleTrackController.subtitleTrack : -1;
	}
	get media() {
		return this._media;
	}
	/**
	* select an subtitle track, based on its index in subtitle track lists
	*/
	set subtitleTrack(subtitleTrackId) {
		const subtitleTrackController = this.subtitleTrackController;
		if (subtitleTrackController) subtitleTrackController.subtitleTrack = subtitleTrackId;
	}
	/**
	* Whether subtitle display is enabled or not
	*/
	get subtitleDisplay() {
		const subtitleTrackController = this.subtitleTrackController;
		return subtitleTrackController ? subtitleTrackController.subtitleDisplay : false;
	}
	/**
	* Enable/disable subtitle display rendering
	*/
	set subtitleDisplay(value) {
		const subtitleTrackController = this.subtitleTrackController;
		if (subtitleTrackController) subtitleTrackController.subtitleDisplay = value;
	}
	/**
	* get mode for Low-Latency HLS loading
	*/
	get lowLatencyMode() {
		return this.config.lowLatencyMode;
	}
	/**
	* Enable/disable Low-Latency HLS part playlist and segment loading, and start live streams at playlist PART-HOLD-BACK rather than HOLD-BACK.
	*/
	set lowLatencyMode(mode) {
		this.config.lowLatencyMode = mode;
	}
	/**
	* Position (in seconds) of live sync point (ie edge of live position minus safety delay defined by ```hls.config.liveSyncDuration```)
	* @returns null prior to loading live Playlist
	*/
	get liveSyncPosition() {
		var _this$latencyControll, _this$latencyControll2;
		return (_this$latencyControll = (_this$latencyControll2 = this.latencyController) == null ? void 0 : _this$latencyControll2.liveSyncPosition) != null ? _this$latencyControll : null;
	}
	/**
	* Estimated position (in seconds) of live edge (ie edge of live playlist plus time sync playlist advanced)
	* @returns 0 before first playlist is loaded
	*/
	get latency() {
		var _this$latencyControll3;
		return ((_this$latencyControll3 = this.latencyController) == null ? void 0 : _this$latencyControll3.latency) || 0;
	}
	/**
	* maximum distance from the edge before the player seeks forward to ```hls.liveSyncPosition```
	* configured using ```liveMaxLatencyDurationCount``` (multiple of target duration) or ```liveMaxLatencyDuration```
	* @returns 0 before first playlist is loaded
	*/
	get maxLatency() {
		var _this$latencyControll4;
		return ((_this$latencyControll4 = this.latencyController) == null ? void 0 : _this$latencyControll4.maxLatency) || 0;
	}
	/**
	* target distance from the edge as calculated by the latency controller
	*/
	get targetLatency() {
		var _this$latencyControll5;
		return ((_this$latencyControll5 = this.latencyController) == null ? void 0 : _this$latencyControll5.targetLatency) || null;
	}
	set targetLatency(latency) {
		if (!this.latencyController) return;
		this.latencyController.targetLatency = latency;
	}
	/**
	* the rate at which the edge of the current live playlist is advancing or 1 if there is none
	*/
	get drift() {
		var _this$latencyControll6;
		return ((_this$latencyControll6 = this.latencyController) == null ? void 0 : _this$latencyControll6.drift) || null;
	}
	/**
	* set to true when startLoad is called before MANIFEST_PARSED event
	*/
	get forceStartLoad() {
		return this.streamController.forceStartLoad;
	}
	/**
	* ContentSteering pathways getter
	*/
	get pathways() {
		return this.levelController.pathways;
	}
	/**
	* ContentSteering pathwayPriority getter/setter
	*/
	get pathwayPriority() {
		return this.levelController.pathwayPriority;
	}
	set pathwayPriority(pathwayPriority) {
		this.levelController.pathwayPriority = pathwayPriority;
	}
	/**
	* returns true when all SourceBuffers are buffered to the end
	*/
	get bufferedToEnd() {
		var _this$bufferControlle3;
		return !!((_this$bufferControlle3 = this.bufferController) != null && _this$bufferControlle3.bufferedToEnd);
	}
	/**
	* returns Interstitials Program Manager
	*/
	get interstitialsManager() {
		return null;
	}
	/**
	* returns an array of parsed iframe variants
	*/
	get iframeVariants() {
		const iframeVariants = this.levelController.iframeVariants;
		return iframeVariants ? iframeVariants : [];
	}
	/**
	* Returns an new iframe focused Hls (HlsIFramesOnly) instance based on `iframeVariants` found in the current asset,
	* or null when none are available. An iframe instance uses iframe variants as its `levels`.
	* Use HlsIFramesOnly.loadMediaAt(time) to render video IFrames in an attached video element.
	*/
	createIFramePlayer(configOverride) {
		return null;
	}
	/**
	* Returns an new image iframe focused Hls (HlsImageIFramesOnly) instance based on `iframeVariants` found in the
	* current asset, or null when no image variants are available. An image iframe instance uses iframe variants with
	* image codec values in CODECS ("mjpg") as its `levels`.
	* Use HlsIFramesOnly.loadMediaAt(time) to load image IFrames.
	* Attach an HTMLImageElement with HlsImageIFramesOnly.attachImage(image), or process image data on FRAG_LOADED.
	*/
	createImageIFramePlayer(configOverride) {
		return null;
	}
	/**
	* returns mediaCapabilities.decodingInfo for a variant/rendition
	*/
	getMediaDecodingInfo(level, audioTracks = this.allAudioTracks) {
		const audioTracksByGroup = getAudioTracksByGroup(audioTracks);
		return emptyEsExports.getMediaDecodingInfoPromise(level, audioTracksByGroup, navigator.mediaCapabilities);
	}
};
Hls.defaultConfig = void 0;
var KeySystemFormats = emptyEsExports.KeySystemFormats;
var KeySystems = emptyEsExports.KeySystems;
var SubtitleStreamController = emptyEsExports.SubtitleStreamController;
var TimelineController = emptyEsExports.TimelineController;
var requestMediaKeySystemAccess = emptyEsExports.requestMediaKeySystemAccess;
export { AbrController, AttrList, Cues as AudioStreamController, Cues as AudioTrackController, Cues as CMCDController, Cues, Cues as EMEController, Cues as SubtitleTrackController, BaseLoader, BasePlaylistController, BaseSegment, BaseStreamController, BufferController, CapLevelController, ChunkMetadata, ContentSteeringController, DateRange, ErrorActionFlags, ErrorController, ErrorDetails, ErrorTypes, Events, FPSController, FetchLoader, Fragment, Hls, Hls as default, HlsSkip, HlsUrlParameters, KeySystemFormats, KeySystems, Level, LevelDetails, LevelKey, LoadStats, LoaderContextType, M3U8Parser, MetadataSchema, NetworkErrorAction, Part, PlaylistLevelType, SubtitleStreamController, TimelineController, XhrLoader, fetchSupported, getMediaSource, isMSESupported, isSupported, requestMediaKeySystemAccess };
