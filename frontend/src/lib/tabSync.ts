// CAR-02: sincronización entre pestañas del mismo navegador. `BroadcastChannel`
// no existe en SSR y algunos navegadores viejos no lo implementan — este
// wrapper degrada a "no-op" en vez de romper la app (la pestaña sigue
// funcionando, solo no se sincroniza con las demás).
export function createTabChannel<T>(name: string): {
  post: (message: T) => void;
  subscribe: (handler: (message: T) => void) => () => void;
} {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return { post: () => undefined, subscribe: () => () => undefined };
  }

  const channel = new BroadcastChannel(name);

  return {
    post: (message: T) => channel.postMessage(message),
    subscribe: (handler: (message: T) => void) => {
      const listener = (event: MessageEvent<T>) => handler(event.data);
      channel.addEventListener("message", listener);
      return () => channel.removeEventListener("message", listener);
    },
  };
}
