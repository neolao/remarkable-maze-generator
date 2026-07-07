#!/usr/bin/env node
import { CORE_VERSION } from "@remarkable-maze-generator/core";
import { Command } from "commander";

const program = new Command();

program
	.name("remarkable-maze")
	.description("Generates mazes as PDF for reMarkable")
	.version(CORE_VERSION);

program.parse();
