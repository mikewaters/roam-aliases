let uninstalls: Function[] = [];

export const extension_helper = {
  on_uninstall: (cb: Function) => {
    uninstalls.push(cb);
  },
  uninstall() {
    uninstalls.forEach((fn) => {
      fn();
    });
    uninstalls = [];
  },
};

export const onRouteChange = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  window.onhashchange = (evt) => {
    setTimeout(() => {
      cb();
    }, 1);
  };
  return () => {
    window.removeEventListener("hashchange", cb);
  };
};

export const keys = <T extends object>(obj: T) => {
  return Object.keys(obj) as unknown as (keyof T)[];
};

export const debounce = <T, R>(cb: (...args: T[]) => R, ms = 500) => {
  let timer: any;
  return (...args: T[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      cb(...args);
      timer = null;
    }, ms);
  };
};


export const delay = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));
