/** DI token holding the resolved {@link WmsEventModuleOptions}. */
export const WMS_EVENT_OPTIONS = Symbol('WMS_EVENT_OPTIONS');

/** DI token for an optional external emitter bridge (e.g. @nestjs/event-emitter). */
export const WMS_EVENT_EMITTER_BRIDGE = Symbol('WMS_EVENT_EMITTER_BRIDGE');

/** DI token for the optional host-neutral actor extractor. */
export const WMS_ACTOR_EXTRACTOR = Symbol('WMS_ACTOR_EXTRACTOR');

/** DI token holding the boolean "enrich stock events" flag (default false). */
export const WMS_STOCK_ENRICH = Symbol('WMS_STOCK_ENRICH');

/** DI token holding the host's registered custom change tables (default none). */
export const WMS_CUSTOM_CHANGE_TABLES = Symbol('WMS_CUSTOM_CHANGE_TABLES');
