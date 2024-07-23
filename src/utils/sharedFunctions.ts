// utils/sharedFunctions.ts

import debounce from 'lodash/debounce';
import eventEmitter from "@/events/eventEmitter";

export const debouncedEmit = debounce(() => {
  eventEmitter.emit('refreshBets');
}, 1000, { leading: true, trailing: false });