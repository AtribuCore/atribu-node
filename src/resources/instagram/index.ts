import type { HttpClientLike } from "../../http";
import { InstagramTriggersResource } from "./triggers";

/**
 * Instagram-specific resource namespace. Mounted on `AtribuClient.instagram`.
 * Cross-channel messaging stays on `AtribuClient.messages` and
 * `AtribuClient.comments`.
 */
export class InstagramNamespace {
  readonly triggers: InstagramTriggersResource;

  constructor(http: HttpClientLike) {
    this.triggers = new InstagramTriggersResource(http);
  }
}

export type {
  InstagramTrigger,
  InstagramTriggerCreateInput,
  InstagramTriggerUpdateInput,
} from "./triggers";
