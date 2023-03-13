import chalk from "chalk";
import moment from "moment";

type LogLevel = "debug" | "info" | "warn" | "error";

const COLORS = {
  debug: "#0c24fa",
  info: "#14fa0c",
  warn: "#faea0c",
  error: "#ff0000",
};

export class Logger {
  public constructor() {}

  private getDate(): string {
    return moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
  }

  private toChalk(type: LogLevel, value: string): string {
    return chalk.hex(COLORS[type])(value);
  }

  private toConsole(messages: any[], type: LogLevel): void {
    console[type](`[${this.getDate()}] - ${this.toChalk(type, type.toUpperCase())} | ${messages.join(" ")}`);
  }

  public info(...messages: any[]): void {
    this.toConsole(messages, "info");
  }

  public debug(...messages: any[]): void {
    this.toConsole(messages, "debug");
  }

  public warn(...messages: any[]): void {
    this.toConsole(messages, "warn");
  }

  public error(...messages: any[]): void {
    this.toConsole(messages, "error");
  }
}
