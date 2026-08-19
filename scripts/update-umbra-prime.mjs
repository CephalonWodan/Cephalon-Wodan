import fs from "node:fs";

const filePath = "/home/ubuntu/warframe-set-builder/client/src/lib/warframe-data-full.json";
const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

const umbraPrime = data.warframes.find(wf => wf.id === "excalibur-umbra-prime");
if (umbraPrime) {
  umbraPrime.imageUrl = "https://wiki.warframe.com/images/ExcaliburUmbraPrime.png?9f21a";
  umbraPrime.health = 300;
  umbraPrime.shield = 300;
  umbraPrime.armor = 250;
  umbraPrime.energy = 225;
  umbraPrime.description = "From the shadow of the long night emerges a new Excalibur. Founder exclusive Warframe for the Chinese build.";
  umbraPrime.polarities = ["vazarin", "madurai", "madurai"];
  umbraPrime.aura = "";
  umbraPrime.passive = {
    name: "Sentience",
    description: "When the Operator transfers out of Excalibur Umbra Prime, he acts as an independent specter fighting with his Exalted Blade."
  };
  umbraPrime.abilities = [
    {
      name: "Slash Dash",
      description: "Dash through foes as a streak of shadow, striking all in the way with the Skana.",
      duration: "1s",
      energy: 25,
      range: "10m",
      strength: "150"
    },
    {
      name: "Radial Blind",
      description: "Emits a brilliant flash of light, blinding all enemies in the vicinity.",
      duration: "15s",
      energy: 50,
      range: "25m",
      strength: "N/A"
    },
    {
      name: "Radial Javelin",
      description: "Sling a flurry of damaging javelins toward nearby enemies.",
      duration: "N/A",
      energy: 75,
      range: "20m",
      strength: "1000"
    },
    {
      name: "Exalted Blade",
      description: "Summon a sword of pure light and wave destructive energy arcs with each swing.",
      duration: "N/A",
      energy: 2.5,
      range: "N/A",
      strength: "250"
    }
  ];
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  console.log("Excalibur Umbra Prime successfully updated!");
} else {
  console.error("Excalibur Umbra Prime not found in dataset!");
}
