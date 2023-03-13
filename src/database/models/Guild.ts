import config from "@soon/config";
import { GuildModelOptions } from "@soon/typings";
import { model, Schema } from "mongoose";

const GuildModel = new Schema<GuildModelOptions>({
  id: { required: true, type: String },
  language: { required: false, type: String, default: "en-US" },
  commandRunning: { required: false, type: Object, default: undefined },
});

export default model<GuildModelOptions>("Guild", GuildModel);
