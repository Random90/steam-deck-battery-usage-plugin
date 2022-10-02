export const secondsToHms = (d: number) => {
    let h = Math.floor(d / 3600).toString().padStart(2, '0');
    let m = Math.floor(d % 3600 / 60).toString().padStart(2, '0');
    let s = Math.floor(d % 3600 % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}