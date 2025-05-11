module.exports = {
  // Masonry Calculations
  brickQuantity(wallAreaM2, brickLengthM, brickHeightM) {
    const brickFaceArea = brickLengthM * brickHeightM;
    return Math.ceil((wallAreaM2 / brickFaceArea) * 1.1);
  },

  mortarVolume(brickCount, mortarVolumePerBrickM3 = 0.0005) {
    return (brickCount * mortarVolumePerBrickM3).toFixed(3);
  },

  wallTies(wallAreaM2) {
    return Math.ceil(wallAreaM2 * 2.5);
  },

  // Plumbing Calculations
  pipeLength(buildingPerimeterM, verticalRunsM) {
    return Math.ceil((buildingPerimeterM + verticalRunsM) * 1.1);
  },

  waterTankSize(dailyUsagePerPersonL, numPeople, storageDays) {
    return dailyUsagePerPersonL * numPeople * storageDays;
  },

  waterFlowRateGravity(headHeightM) {
    return (0.278 * Math.sqrt(headHeightM)).toFixed(2);
  },

  // Electrical Calculations
  conduitLength(routeLengthM) {
    return Math.ceil(routeLengthM * 1.1);
  },

  cableCurrent(loadW, voltageV) {
    return (loadW / voltageV).toFixed(2);
  },

  lightingPoints(roomAreaM2, lightCoverageM2) {
    return Math.ceil(roomAreaM2 / lightCoverageM2);
  },

  powerSockets(roomAreaM2) {
    return Math.ceil(roomAreaM2 / 4);
  },

  // Plasterboard Calculations
  plasterboardSheets(areaM2, sheetAreaM2) {
    return Math.ceil((areaM2 / sheetAreaM2) * 1.1);
  },

  jointCompound(areaM2) {
    return (areaM2 * 0.5).toFixed(2);
  },

  plasterboardScrews(sheetCount) {
    return sheetCount * 50;
  },

  // Concreting Calculations
  slabRebarCount(widthM, spacingM) {
    return Math.ceil(widthM / spacingM);
  },

  concreteVolume(lengthM, widthM, depthM) {
    return (lengthM * widthM * depthM).toFixed(2);
  },

  rebarLapLength(diameterMM) {
    return diameterMM * 40;
  },

  // Carpentry Calculations
  roofRafterCount(roofLengthM, spacingM) {
    return Math.ceil(roofLengthM / spacingM) + 1;
  },

  timberVolume(lengthM, widthM, thicknessM, quantity = 1) {
    return (lengthM * widthM * thicknessM * quantity).toFixed(3);
  },

  formworkPanelCount(areaM2, panelAreaM2) {
    return Math.ceil(areaM2 / panelAreaM2);
  },

  doorHingeCount(doorHeightM, numDoors) {
    return doorHeightM > 2.1 ? numDoors * 4 : numDoors * 3;
  },

  plywoodForFlooring(floorAreaM2, sheetAreaM2) {
    return Math.ceil((floorAreaM2 / sheetAreaM2) * 1.1);
  },

  skirtingLength(roomPerimeterM) {
    return Math.ceil(roomPerimeterM * 1.1);
  },

  handrailPostCount(handrailLengthM, maxSpacingM) {
    return Math.ceil(handrailLengthM / maxSpacingM) + 1;
  },

  beamDeflection(spanMM) {
    return (spanMM / 360).toFixed(2);
  },

  partitionStudCount(wallLengthMM, studSpacingMM) {
    return Math.ceil(wallLengthMM / studSpacingMM) + 1;
  },

  architraveLength(doorHeightM, doorWidthM) {
    return Math.ceil((2 * doorHeightM + doorWidthM) * 1.1);
  },

  lintelLength(openingWidthM) {
    return openingWidthM + 0.6; // 300mm each side
  },

  // Roofing Calculations
  roofAreaGable(widthM, slopeLengthM) {
    return widthM * slopeLengthM * 2;
  },

  roofTileCount(roofAreaM2, tileCoverageM2) {
    return Math.ceil((roofAreaM2 / tileCoverageM2) * 1.1);
  },

  // Demolition & Waste Calculations
  demolitionDebrisVolume(wallAreaM2, wallThicknessM) {
    return (wallAreaM2 * wallThicknessM).toFixed(2);
  },

  skipBinTrips(debrisVolumeM3, skipVolumeM3) {
    return Math.ceil(debrisVolumeM3 / skipVolumeM3);
  },

  demolitionManHours(volumeM3, productivityM3PerHour) {
    return (volumeM3 / productivityM3PerHour).toFixed(2);
  },

  excavationVolume(lengthM, widthM, depthM) {
    return (lengthM * widthM * depthM).toFixed(2);
  },

  paintCoverage(areaM2, coveragePerLitreM2) {
    return Math.ceil((areaM2 / coveragePerLitreM2) * 1.1);
  }
};
