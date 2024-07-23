// utils/sharedFunctions.ts
import debounce from 'lodash/debounce';
import eventEmitter from "@/events/eventEmitter";

export const debouncedEmit = () => {
  return new Promise<void>((resolve) => {
    const emitAndResolve = debounce(() => {
      eventEmitter.emit('refreshBets');
      eventEmitter.emit('refreshComplete');
      resolve();
    }, 1000, { leading: true, trailing: false });
    
    emitAndResolve();
  });
};