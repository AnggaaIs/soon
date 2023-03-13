import * as shoukaku from "shoukaku";

declare module "shoukaku" {
  export interface Track {
    requester: ?string;
  }
}
