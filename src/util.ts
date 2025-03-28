
export const apiSvcUrl = //'https://localhost:7007'; /*
  'https://ravencolonial100-awcbdvabgze4c5cq.canadacentral-01.azurewebsites.net'; // */


export const delayFocus = (target: string, delay = 10): void => {
  setTimeout(() => document.getElementById(target)?.focus(), delay);
}

export const fcFullName = (name: string, displayName: string) => {
  if (name === displayName) {
    return name;
  } else {
    return `${displayName} (${name})`;
  }
};

export const sumCargo = (cargo: Record<string, number>): number => {
  const sum = Object.values(cargo).reduce((s, v) => s += v, 0);
  return sum;
}