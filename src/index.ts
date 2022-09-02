import { SMM } from '@crankshaft/types';

export const load = (smm: SMM) => {
  console.info('Hello steam!');
};

export const unload = (smm: SMM) => {
  console.info('Bye bye steam :(');
};
