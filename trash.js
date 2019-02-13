report.getColumnHeader('CampaignId').getBulkUploadColumnName(),
report.getColumnHeader('CampaignName').getBulkUploadColumnName(),
report.getColumnHeader('CampaignStatus').getBulkUploadColumnName()]);


campaign.targeting()
    .platforms()
    .mobile()
    .get()
    .next().
    setBidModifier(1.2);



      // Build ad group.
  var adGroupOp = campaign.newAdGroupBuilder()
        .withName(name)
        .withStatus(status)
        .withMaxCpc(defaultBid)
        .build();

        if (!adGroupOp.isSuccessful()) {
    resultsByRow[0] = 'ERROR';
    resultsByRow[1] = 'Error creating ad group: ' +
        adGroupOp.getErrors();
    return null;
  }


  var outputColumn = sheet.getLastColumn() + 1;
  var resultHeaderRange = sheet.getRange(1, outputColumn, 1, 2);
  resultHeaderRange.setValues([resultsByRow]);
  resultHeaderRange.setFontColors([resultColors]);
  resultHeaderRange.setFontWeights([['Bold', 'Bold']]);


  var placementOperation = adGroup.display()
     .newPlacementBuilder()
     .withUrl('http://www.site.com')  // required
     .exclude();
  var placement = placementOperation.getResult();
  Logger.log('Placement with id = %s and url = %s was created.', placement.getId(), placement.getUrl());


