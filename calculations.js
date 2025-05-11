module.exports = {
  deckingBoardCount(deckLengthMM, boardWidthMM, gapMM) {
    return Math.ceil(deckLengthMM / (boardWidthMM + gapMM));
  },

  studCount(wallLengthMM, studSpacingMM) {
    return Math.ceil(wallLengthMM / studSpacingMM) + 1;
  },

  sheathingPanelCount(wallAreaM2, panelAreaM2) {
    return Math.ceil(wallAreaM2 / panelAreaM2);
  },

  floorJoistCount(floorLengthMM, joistSpacingMM) {
    return Math.ceil(floorLengthMM / joistSpacingMM) + 1;
  },

  stairTreadCount(totalRiseMM, riserHeightMM) {
    const risers = Math.ceil(totalRiseMM / riserHeightMM);
    return { risers, treads: risers - 1 };
  },

  rafterLength(runMM, riseMM) {
    return Math.round(Math.sqrt(runMM ** 2 + riseMM ** 2));
  },

  trimLength(perimeterM) {
    return Math.ceil(perimeterM * 1.1);
  },

  subfloorAdhesive(subfloorAreaM2, coveragePerTubeM2) {
    return Math.ceil(subfloorAreaM2 / coveragePerTubeM2);
  },

  fastenerCount(panels, fastenersPerPanel) {
    return Math.ceil(panels * fastenersPerPanel);
  },

  beamDepthEstimate(clearSpanM) {
    return (clearSpanM / 0.5).toFixed(2); // cm
  },

  roofSheathingCount(roofAreaM2, panelAreaM2) {
    return Math.ceil((roofAreaM2 / panelAreaM2) * 1.05);
  },

  framingNailCount(studs, nailsPerConnection) {
    return Math.ceil(studs * nailsPerConnection);
  },

  insulationRolls(wallAreaM2, coveragePerRollM2) {
    return Math.ceil(wallAreaM2 / coveragePerRollM2);
  },

  boardFeetToCubicMeters(thicknessMM, widthMM, lengthM) {
    return (thicknessMM * widthMM * lengthM / 1_000_000).toFixed(3);
  },

  drywallSheetCount(areaM2, sheetAreaM2) {
    return Math.ceil((areaM2 / sheetAreaM2) * 1.1);
  },

  concreteFormworkPanels(perimeterM, heightM, panelAreaM2) {
    return Math.ceil((perimeterM * heightM) / panelAreaM2);
  },

  railingPostCount(deckPerimeterM, maxSpacingM) {
    return Math.ceil(deckPerimeterM / maxSpacingM) + 1;
  },

  sidingBoardCount(wallAreaM2, effectiveCoverageM2) {
    return Math.ceil((wallAreaM2 / effectiveCoverageM2) * 1.1);
  },

  paintQuantity(surfaceAreaM2, coveragePerLitreM2) {
    return Math.ceil((surfaceAreaM2 / coveragePerLitreM2) * 1.1);
  },

  weatherboardQuantity(wallAreaM2, boardWidthM, overlapM) {
    const effectiveCoverage = boardWidthM - overlapM;
    const boardsPerM2 = 1 / effectiveCoverage;
    return Math.ceil(wallAreaM2 * boardsPerM2 * 1.1);
  },

  totalWeatherboardLength(wallAreaM2, effectiveCoverageM) {
    return Math.ceil(wallAreaM2 / effectiveCoverageM);
  },

  weatherboardFasteners(boardCount, fastenersPerBoard) {
    return Math.ceil(boardCount * fastenersPerBoard);
  },

  verticalWeatherboardCount(wallAreaM2, boardWidthM, gapM) {
    const effectiveCoverage = boardWidthM + gapM;
    const boardsPerM2 = 1 / effectiveCoverage;
    return Math.ceil(wallAreaM2 * boardsPerM2);
  },

  demolitionDebrisVolume(timberVolumeM3, expansionFactor = 1.4) {
    return (timberVolumeM3 * expansionFactor).toFixed(2);
  },

  skipBinSize(debrisVolumeM3, skipVolumeM3) {
    return Math.ceil(debrisVolumeM3 / skipVolumeM3);
  },

  fastenerRemovalTime(fastenerCount, timePerFastenerMin) {
    return (fastenerCount * timePerFastenerMin / 60).toFixed(2); // Hours
  },

  manualDemolitionLabor(demoVolumeM3, productivityRateM3PerHour) {
    return (demoVolumeM3 / productivityRateM3PerHour).toFixed(2); // Hours
  },

  demolitionCostEstimate(demoVolumeM3, costPerM3) {
    return (demoVolumeM3 * costPerM3).toFixed(2);
  },

  plasterboardDemolition(wallAreaM2, sheetAreaM2) {
    return Math.ceil(wallAreaM2 / sheetAreaM2);
  },

  floorboardRemovalTime(floorAreaM2, productivityRateM2PerHour) {
    return (floorAreaM2 / productivityRateM2PerHour).toFixed(2); // Hours
  },

  offcutWasteCalculation(totalMaterialLengthM, wasteFactor = 1.1) {
    return Math.ceil(totalMaterialLengthM * wasteFactor);
  }
};
