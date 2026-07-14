import { LocalSessionStore } from "./infrastructure/local-session-store";
import { watchForServiceWorkerUpdates } from "./infrastructure/service-worker-updates";
import { SwingThingController } from "./ui/swing-thing-controller";
import { registerSW } from "virtual:pwa-register";
import "./styles/app.css";

const getStorage = (): Storage | undefined => {
  try { return window.localStorage; } catch { return undefined; }
};

new SwingThingController(new LocalSessionStore(getStorage())).start();

registerSW({
  immediate: true,
  onRegisteredSW: (_serviceWorkerUrl, registration) => {
    if (registration) watchForServiceWorkerUpdates(registration);
  }
});
