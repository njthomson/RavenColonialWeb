import { IComboBoxOption } from '@fluentui/react';
import costs1 from './assets/colonization-costs.json';
import costs2 from './assets/colonization-costs2.json';

const mapCargo1: Record<string, string> = {
  "Liquid Oxygen": "liquidoxygen",
  "Water": "water",
  "Ceramic Composites": "ceramiccomposites",
  "CMM Composite": "cmmcomposite",
  "Insulating Membrane": "insulatingmembrane",
  "Polymers": "polymers",
  "Semiconductors": "semiconductors",
  "Superconductors": "superconductors",
  "Aluminium": "aluminium",
  "Copper": "copper",
  "Steel": "steel",
  "Titanium": "titanium",
  "Computer Components": "computercomponents",
  "Medical Diagnostic Equipment": "medicaldiagnosticequipment",
  "Food Cartridges": "foodcartridges",
  "Fruit and Vegetables": "fruitandvegetables",
  "Non-Lethal Weapons": "nonlethalweapons",
  "Power Generators": "powergenerators",
  "Water Purifiers": "waterpurifiers",
  "Micro Controllers": "microcontrollers",
  "Grain": "grain",
  "Pesticides": "pesticides",
  "Agri-Medicines": "agriculturalmedicines",
  "Crop Harvesters": "cropharvesters",
  "Biowaste": "biowaste",
  "Beer": "beer",
  "Liquor": "liquor",
  "Battle Weapons": "battleweapons",
  "Reactive Armour": "reactivearmour",
  "H.E. Suits": "hazardousenvironmentsuits",
  "Robotics": "robotics",
  "Resonating Separators": "resonatingseparators",
  "Bioreducing Lichen": "bioreducinglichen",
  "Geological Equipment": "geologicalequipment",
  "Muon Imager": "mutomimager",
  "Basic Medicines": "basicmedicines",
  "Combat Stabilizers": "combatstabilizers",
  "Military Grade Fabrics": "militarygradefabrics",
  "Advanced Catalysers": "advancedcatalysers",
  "Wine": "wine",
  "Animal Meat": "animalmeat",
  "Fish": "fish",
  "Tea": "tea",
  "Coffee": "coffee",
  "Land Enrichment Systems": "terrainenrichmentsystems",
  "Surface Stabilisers": "surfacestabilisers",
  "Building Fabricators": "buildingfabricators",
  "Structural Regulators": "structuralregulators",
  "Evacuation Shelter": "evacuationshelter",
  "Emergency Power Cells": "emergencypowercells",
  "Survival Equipment": "survivalequipment",
  "Thermal Cooling Units": "thermalcoolingunits",
  "Microbial Furnaces": "heliostaticfurnaces",
  "Mineral Extractors": "mineralextractors"
};

export const prepOne = (): void => {
  var lines = costs1
    // .filter(d => !d['Building Type'])
    //.filter(d => d.Location === 'Surface' && d.Tier === '2')
    // .filter(d => d.Tier === '3')
    .map(d => {
      // var bt = d['Building Type'];
      // var parts = bt.split(' ');
      // var buildType = `${parts[1]}-${parts[0]}`.toLowerCase()

      var displayName = d['Building Type'];
      var buildType = d.Layouts[0].toLowerCase();

      if (['Small', 'Medium', 'Large'].includes(d['Building Type'])) {
        // buildType = `${d.Location}-${d.economy.Facility}-${d.Tier}`.toLowerCase();
        displayName = `${d.economy.Facility} Settlement`;
      }

      if (d.Location === 'Surface' && !displayName.endsWith(' Settlement')) {
        displayName += ' Settlement';
      }

      if (d['Building Type'] === '' && d.Location === 'Surface') {
        displayName = `${d.Category} Surface Outpost`;
      }

      displayName = displayName.replace('Settlement Settlement', 'Settlement');

      if (buildType === 'asteroid (adjusts to ring type)') {
        buildType = 'asteroid';
        d.Layouts[0] = 'Asteroid';
      }

      //var dn = bt ? bt : d.economy.Facility;
      var cargo2: Record<string, number> = {};
      for (var key in d.cargo) {
        if (!mapCargo1[key]) console.error(`bad key: ${key} !`);
        cargo2[mapCargo1[key]] = parseInt((d.cargo as any)[key]);
      }

      return {
        buildType: buildType,
        category: d.Category,
        tier: parseInt(d.Tier),
        location: d.Location.toLowerCase(),
        displayName: displayName,
        layouts: d.Layouts,
        cargo: cargo2,
      };
    });

  lines.reduce((set, ln) => {
    if (set.has(ln.buildType)) {
      console.error(`${ln.buildType}`, ln);
    }
    if (ln.buildType.includes(' ')) {
      console.error(`${ln.buildType}`, ln);
    }
    set.add(ln.buildType);
    return set;
  }, new Set<string>())

  // for export
  console.log('[' + lines.map(d => JSON.stringify(d)).join("\r\n") + ']');

  /*
  var cargoMap: Record<string, string> = {};
  for (var key1 in lines) {
    for (var key2 in lines[key1].cargo) {

      if (key2 === 'Agri-Medicines')
        cargoMap[key2] = 'agriculturalmedicines'
      else if (key2 === 'H.E. Suits')
        cargoMap[key2] = 'hazardousenvironmentsuits'
      else
        cargoMap[key2] = key2.toLowerCase()
          .replaceAll(' ', '')
          .replaceAll('-', '');

    }
  }
  console.log(JSON.stringify(cargoMap, null, 2));
  // */
}

export const prepTwo = (): IComboBoxOption[] => {
  var lines = costs2
    .filter(d => d.tier === 3 && d.location === 'surface')
    .map(d => {
      return { key: d.buildType, text: `${d.displayName} (${d.layouts.join(', ')})` };
    });

  const buildTypes: IComboBoxOption[] = [
    // { key: '', text: 'Tier 1: Space', itemType: SelectableOptionMenuItemType.Header },
    ...lines
  ];
  console.log(lines.map(d => JSON.stringify(d)).join(",\r\n"));

  return buildTypes;
}


export const prepIconLookup = () => {
  const mapCargo2: Record<string, string> = {};
  // reverse mapping
  for (var key in mapCargo1) {
    var value = mapCargo1[key];
    mapCargo2[value] = key;
  }

  console.log(JSON.stringify(mapCargo2, null, 2));

}