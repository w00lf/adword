var COLUMNS_TO_IGNORE = ['Keyword', 'Ad Type'];
var ACTION_RESULT = {
  success: function (object) {
    return {
      success: true,
      object: object,
    }
  },
  error: function (errorText) {
    return {
      success: false,
      error: errorText
    }
  }
}

function main() {
  var bulkSpreadsheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1CooB3yyF-2JvMCQMWjzZ4kSV--rR6ztKIMikLtv3KqQ/edit");
  var bulkValues = bulkSpreadsheet.getDataRange().getValues();
  var headers = bulkValues.shift();
  uploadRange(headers, bulkValues);
  Utilities.sleep(5000);
  var customStatuses = uploadCustomEntities(headers, bulkValues);
  var statuses = checkStatusEntries(headers, bulkValues);
  Logger.log(statuses);
  for (var i in customStatuses) {
    statuses[i] = customStatuses[i];
  }
  Logger.log(statuses);
  updateCustomStatusSpreadsheet(bulkSpreadsheet, statuses);
}

function uploadRange(headers, rows) {
  var upload = AdWordsApp.bulkUploads().newCsvUpload(headers);
  upload.forCampaignManagement();

  for (var i in rows) {
    var row = rows[i];
    var status = row[0];
    if (status != 'ready' || haveIgnoredColumns(headers, row)) continue;

    var uploadObject = {};
    for (var j in headers) {
      uploadObject[headers[j]] = row[j]
    }
    upload.append(uploadObject);
  }
  upload.apply();
}

function uploadCustomEntities(headers, rows) {
  var statuses = {};
  for (var i in rows) {
    var row = rows[i];
    var status = row[0];
    var operationResult;
    if (status != 'ready' || !haveIgnoredColumns(headers, row)) continue;
    var keywordColumn = headers.indexOf('Keyword');
    if (keywordColumn && row[keywordColumn]) operationResult = uploadKeywords(headers, row, keywordColumn);
    var adColumn = headers.indexOf('Ad Type');
    if (adColumn && row[adColumn]) operationResult = uploadAd(headers, row);
    statuses[i] = operationResult;
  }
  return statuses;
}

function uploadKeywords(headers, row, keywordColumn) {
  var campaignIndex = headers.indexOf('Campaign');
  var adGroupIndex = headers.indexOf('Ad group');
  var adCampaign = getCampaign(row[campaignIndex]);
  if (!adCampaign) return ACTION_RESULT.error('Cannot find campaign ' + row[campaignIndex]);
  var adGroup = getAdgroup(adCampaign, row[adGroupIndex]);
  if (!adGroup) return ACTION_RESULT.error('Cannot find adgroup ' + row[adGroupIndex]);
  var keywords = row[keywordColumn].split(',');
  for (var i in keywords) {
    var keyword = keywords[i].trim();
    if (keyword.length == 0) continue;
    Logger.log(keyword);
    var keywordOperation = adGroup.newKeywordBuilder().withText(keyword).build();
    if (!keywordOperation.isSuccessful()) return ACTION_RESULT.error(keywordOperation.getErrors());
  }
  return ACTION_RESULT.success();
}

function uploadAd(headers, row) {
  var campaignIndex = headers.indexOf('Campaign');
  var adGroupIndex = headers.indexOf('Ad group');
  var adCampaign = getCampaign(row[campaignIndex]);
  if (!adCampaign) return ACTION_RESULT.error("Cannot find campaign with name " + row[campaignIndex]);
  var adGroup = getAdgroup(adCampaign, row[adGroupIndex]);
  if (!adGroup) return ACTION_RESULT.error("Cannot find adgroup with name " + row[adGroupIndex]);
  var adType = row[headers.indexOf('Ad Type')];
  var headline1 = row[headers.indexOf('Headline 1')];
  var headline2 = row[headers.indexOf('Headline 2')];
  var headline3 = row[headers.indexOf('Headline 3')];
  var description = row[headers.indexOf('Description 1')];
  var description2 = row[headers.indexOf('Description 2')];
  var finalUrl = row[headers.indexOf('Final URL')];
  var businessName = row[headers.indexOf('Business Name')];

  var adOperation;
  if (adType == 'Responsive display ad') {
    var createMarketingImageResult = createImageMedia(row[headers.indexOf('Marketing Image')]);
    if (!createMarketingImageResult.success) return createMarketingImageResult;
    var marketingImage = createMarketingImageResult.object;
    Logger.log(marketingImage);
    var logoImageResult = createImageMedia(row[headers.indexOf('Logo Image')]);
    if (!logoImageResult.success) return logoImageResult;
    var logoImage = logoImageResult.object;
    Logger.log(logoImage);

    adOperation = adGroup.newAd().responsiveDisplayAdBuilder()
      .withShortHeadline(headline1)
      .withLongHeadline(headline2)
      .withDescription(description)
      .withBusinessName(businessName)
      .withMarketingImage(marketingImage)
      .withLogoImage(logoImage)
      .withFinalUrl(finalUrl)
      .build();
  } else {
    adOperation = adGroup.newAd().expandedTextAdBuilder()
      .withHeadlinePart1(headline1)
      .withHeadlinePart2(headline2)
      .withHeadlinePart3(headline3)
      .withDescription(description)
      .withDescription2(description2)
      .withFinalUrl(finalUrl)
      .build();
  }
  if(adOperation.isSuccessful())
    return ACTION_RESULT.success();
  else
    return ACTION_RESULT.error(adOperation.getErrors());
}

function createImageMedia(imageUrl) {
  try {
    var imageBlob = UrlFetchApp.fetch(imageUrl).getBlob();
    var mediaOperation = AdWordsApp.adMedia().newImageBuilder()
      .withData(imageBlob)
      .build();
    return ACTION_RESULT.success(mediaOperation.getResult());
  } catch(error) {
    return ACTION_RESULT.error(error);
  }
}

function haveIgnoredColumns(headers, row) {
  for(i in COLUMNS_TO_IGNORE) {
    var columnName = COLUMNS_TO_IGNORE[i];
    var ignoredColumn = headers.indexOf(columnName);
    if (row[ignoredColumn]) return true;
  }
  return false;
}

function checkStatusEntries(headers, rows) {
  var CAMPAIGN_NAME_COLUMN = headers.indexOf('Campaign');
  var ADGROUP_NAME_COLUMN = headers.indexOf('Ad group');

  statuses = {};
  for (var i in rows) {
    var row = rows[i];
    if(haveIgnoredColumns(headers, row)) continue;
    var campaign = getCampaign(row[CAMPAIGN_NAME_COLUMN]);
    if (!campaign) {
      statuses[i] = ACTION_RESULT.error('Parent campaign ' + row[CAMPAIGN_NAME_COLUMN] + ' not found');
      continue;
    }
    if (row[ADGROUP_NAME_COLUMN]) {
      var adgroup;
      adgroup = getAdgroup(campaign, row[ADGROUP_NAME_COLUMN]);
      if (adgroup){
        updateAdGroup(adgroup, headers, row);
        statuses[i] = ACTION_RESULT.success();
      } else
        statuses[i] = ACTION_RESULT.error('Cannot find group ' + row[ADGROUP_NAME_COLUMN]);
    } else {
      statuses[i] = ACTION_RESULT.success();
    }
  }
  return statuses;
}

function updateCampaign(campaign, headers, row) {
  var DEVICE_NAME_COLUMN = headers.indexOf('DevicePreferences');
  switch (row[DEVICE_NAME_COLUMN]) {
    case 'Mobile':
      campaign.targeting().platforms().desktop().get().next().setBidModifier(0);
      campaign.targeting().platforms().tablet().get().next().setBidModifier(0);
      break;
    case 'Tablet':
      campaign.targeting().platforms().mobile().get().next().setBidModifier(0);
      campaign.targeting().platforms().desktop().get().next().setBidModifier(0);
      break;
    case 'Desktop':
      campaign.targeting().platforms().mobile().get().next().setBidModifier(0);
      campaign.targeting().platforms().tablet().get().next().setBidModifier(0);
      break;
    default:
      break;
  }
}

function updateAdGroup(adgroup, headers, row) {
  var EXCLUSION_NAME_COLUMN = headers.indexOf('Placement Exclusion');
  if (!row[EXCLUSION_NAME_COLUMN]) return;
  var urls = row[EXCLUSION_NAME_COLUMN].split(',');
  for (var i in urls) {
    var url = urls[i];
    var placementOperation = adgroup.display()
      .newPlacementBuilder()
      .withUrl(url) // required
      .exclude();
    var placement = placementOperation.getResult();
    Logger.log('Placement with id = %s and url = %s was created.', placement.getId(), placement.getUrl());
  }
}

function getCampaign(name) {
  var campaign = AdWordsApp.campaigns().withCondition('Name = "' + name + '"').get();
  if (campaign.hasNext()) return campaign.next();
  else {
    Logger.log("No status for campaign " + name)
  }
}

function getAdgroup(campaign, name) {
  var adgroup = campaign.adGroups().withCondition('Name = "' + name + '"').get();
  if (adgroup.hasNext()) return adgroup.next();
  else {
    Logger.log("No status for adgroup " + name);
  }
}

function updateCustomStatusSpreadsheet(bulkSpreadsheet, statuses) {
  Logger.log(statuses);
  var sheet = bulkSpreadsheet.getSheets()[0];
  for (var i in statuses) {
    var status = statuses[i];
    var index = Number(i) + 2;
    var cell = sheet.getRange("A" + index);
    if (status.success) {
      cell.setValue('done');
    } else {
      cell.setValue('error ' + status.error);
    }
  }
}