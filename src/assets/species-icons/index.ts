import redfish from "./redfish.png";
import snook from "./snook.png";
import tarpon from "./tarpon.png";
import speckled_trout from "./speckled_trout.png";
import flounder from "./flounder.png";
import permit from "./permit.png";
import bonefish from "./bonefish.png";
import mahi from "./mahi.png";
import tuna from "./tuna.png";
import marlin from "./marlin.png";
import sailfish from "./sailfish.png";
import wahoo from "./wahoo.png";
import grouper from "./grouper.png";
import snapper from "./snapper.png";
import kingfish from "./kingfish.png";
import amberjack from "./amberjack.png";
import swordfish from "./swordfish.png";
import largemouth_bass from "./largemouth_bass.png";
import smallmouth_bass from "./smallmouth_bass.png";
import trout from "./trout.png";
import walleye from "./walleye.png";
import pike from "./pike.png";
import musky from "./musky.png";
import catfish from "./catfish.png";
import salmon from "./salmon.png";
import panfish from "./panfish.png";
import hogfish from "./hogfish.png";
import lionfish from "./lionfish.png";
import lobster from "./lobster.png";

export const SPECIES_ICONS: Record<string, string> = {
  redfish,
  snook,
  tarpon,
  speckled_trout,
  flounder,
  permit,
  bonefish,
  mahi,
  tuna,
  marlin,
  sailfish,
  wahoo,
  grouper,
  snapper,
  kingfish,
  amberjack,
  swordfish,
  largemouth_bass,
  smallmouth_bass,
  trout,
  walleye,
  pike,
  musky,
  catfish,
  salmon,
  panfish,
  hogfish,
  lionfish,
  lobster,
};

export function getSpeciesIcon(id: string): string | undefined {
  return SPECIES_ICONS[id];
}
