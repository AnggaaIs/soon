import { NodeOption } from "shoukaku";

import { version } from "../package.json";

export const botConfig = {
  token: "",
  mongo_url: "",
  owners: [""],
  guild_id_dev: "",
  shards: 1,
  version,
  nodes: [
    {
      name: "",
      url: "",
      auth: "",
    },
  ] as NodeOption[],
  genius: {
    client_id: "",
    client_secret: "",
    client_access_token: "",
  },
};

export default {
  botConfig,
};
