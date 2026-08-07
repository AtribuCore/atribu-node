import type { HttpClientLike } from "../../http";
import { InstagramTriggersResource } from "./triggers";
import { InstagramContactsResource } from "./contacts";
import { InstagramMediaResource } from "./media";

/**
 * Instagram-specific resource namespace. Mounted on `AtribuClient.instagram`.
 * Cross-channel messaging stays on `AtribuClient.messages` and
 * `AtribuClient.comments`.
 */
export class InstagramNamespace {
  readonly triggers: InstagramTriggersResource;
  readonly contacts: InstagramContactsResource;
  readonly media: InstagramMediaResource;

  constructor(http: HttpClientLike) {
    this.triggers = new InstagramTriggersResource(http);
    this.contacts = new InstagramContactsResource(http);
    this.media = new InstagramMediaResource(http);
  }
}

export type {
  InstagramTrigger,
  InstagramTriggerCreateInput,
  InstagramTriggerUpdateInput,
} from "./triggers";
export type { InstagramContact, GetContactOptions } from "./contacts";
export type {
  InstagramMedia,
  InstagramMediaChild,
  InstagramMediaPage,
  InstagramMediaContainerInput,
  InstagramMediaContainer,
  InstagramMediaPublishInput,
  InstagramMediaPublishResult,
  InstagramMediaListOptions,
  InstagramMediaReadOptions,
  InstagramMediaWriteOptions,
} from "./media";
