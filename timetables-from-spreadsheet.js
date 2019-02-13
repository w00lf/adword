/*
 *
 * Advanced ad scheduling
 *
 * This script will apply ad schedules to campaigns or shopping campaigns and set the
 * ad schedule bid modifier and mobile bid modifier at each hour according to
 * multiplier timetables in a Google sheet.
 *
 * Version: 2.0
 * brainlabsdigital.com
 *
 */

function main() {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  //Options

  //The Google sheet to use
  //The default value is the example sheet linked to in the article
  var spreadsheetUrl = "https://docs.google.com/a/brainlabsdigital.com/spreadsheets/d/1JDGBPs2qyGdHd94BRZw9lE9JFtoTaB2AmlL7xcmLx2g/edit#gid=0";

  //Shopping or regular campaigns
  //Use true if you want to run script on shopping campaigns (not regular campaigns).
  //Use false for regular campaigns.
  var shoppingCampaigns = false;

  //Use true if you want to set mobile bid adjustments as well as ad schedules.
  //Use false to just set ad schedules.
  var runMobileBids = true;

  //Optional parameters for filtering campaign names. The matching is case insensitive.
  //Select which campaigns to exclude e.g ["foo", "bar"] will ignore all campaigns
  //whose name contains 'foo' or 'bar'. Leave blank [] to not exclude any campaigns.
  var excludeCampaignNameContains = [];

  //Select which campaigns to include e.g ["foo", "bar"] will include only campaigns
  //whose name contains 'foo' or 'bar'. Leave blank [] to include all campaigns.
  var includeCampaignNameContains = [];

  //When you want to stop running the ad scheduling for good, set the lastRun
  //variable to true to remove all ad schedules and mobile bid modifiers.
  var lastRun = false;

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  //Initialise for use later.
  var weekDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  var adScheduleCodes = [];
  var campaignIds = [];

  //Retrieving up hourly data
  var scheduleRange = "B2:H25";
  var accountName = AdWordsApp.currentAccount().getName();
  var spreadsheet = SpreadsheetApp.openByUrl(spreadsheetUrl);
  var sheets = spreadsheet.getSheets();

  var timeZone = AdWordsApp.currentAccount().getTimeZone();
  var date = new Date();
  var dayOfWeek = parseInt(Utilities.formatDate(date, timeZone, "uu"), 10) - 1;
  var hour = parseInt(Utilities.formatDate(date, timeZone, "HH"), 10);

  var sheet = sheets[0];
  var data = sheet.getRange(scheduleRange).getValues();

  //This hour's bid multiplier.
  var thisHourMultiplier = data[hour][dayOfWeek];
  var lastHourCell = "I2";
  sheet.getRange(lastHourCell).setValue(thisHourMultiplier);

  //The next few hours' multipliers
  var timesAndModifiers = [];
  for (var h = 0; h < 4; h++) {
    var newHour = (hour + h) % 24;
    if (hour + h > 23) {
      var newDay = (dayOfWeek + 1) % 7;
    } else {
      var newDay = dayOfWeek;
    }
    var bidModifier = data[newHour][newDay];
    if (isNaN(bidModifier) || (bidModifier < -0.9 && bidModifier > -1) || bidModifier > 9) {
      Logger.log("Bid modifier '" + bidModifier + "' for " + weekDays[newDay] + " " + newHour + " is not valid.");
      timesAndModifiers.push([newHour, weekDays[newDay], 0]);
    } else if (bidModifier != -1 && bidModifier.length != 0) {
      timesAndModifiers.push([newHour, weekDays[newDay], bidModifier]);
    }
  }

  if (timesAndModifiers.length === 0) {
    // If there are no modifiers then the campaigns should not be running for the next few hours.
    // If we just removed all schedules, then ads would start running (with no modifier)
    // so an arbitrary ad schedule is created (scheduled for yesterday so it does not affect anything).
    timesAndModifiers.push([0, weekDays[(dayOfWeek + 6) % 7], 0.0]);
  }


  //Pull a list of all relevant campaign IDs in the account.
  var campaignSelector = ConstructIterator(shoppingCampaigns)
  for (var i = 0; i < excludeCampaignNameContains.length; i++) {
    campaignSelector = campaignSelector.withCondition('Name DOES_NOT_CONTAIN_IGNORE_CASE "' + excludeCampaignNameContains[i] + '"');
  }
  var campaignIterator = campaignSelector.get();
  while (campaignIterator.hasNext()) {
    var campaign = campaignIterator.next();
    var campaignName = campaign.getName();
    var includeCampaign = false;
    if (includeCampaignNameContains.length === 0) {
      includeCampaign = true;
    }
    for (var i = 0; i < includeCampaignNameContains.length; i++) {
      var index = campaignName.toLowerCase().indexOf(includeCampaignNameContains[i].toLowerCase());
      if (index !== -1) {
        includeCampaign = true;
        break;
      }
    }
    if (includeCampaign) {
      var campaignId = campaign.getId();
      campaignIds.push(campaignId);
    }
  }

  //Return if there are no campaigns.
  if (campaignIds.length === 0) {
    Logger.log("There are no campaigns matching your criteria.");
    return;
  }

  //Remove all ad scheduling and mobile bid adjustments for the last run.
  if (lastRun) {
    checkAndRemoveAdSchedules(campaignIds, []);
    ModifyMobileBidAdjustment(campaignIds, 0);
    return;
  }

  // Change the mobile bid adjustment
  if (runMobileBids) {
    if (sheets.length < 2) {
      Logger.log("Mobile ad schedule sheet was not found in the Google spreadsheet.");
    } else {
      var sheet = sheets[1];
      var data = sheet.getRange(scheduleRange).getValues();
      var thisHourMultiplier_Mobile = data[hour][dayOfWeek];

      if (thisHourMultiplier_Mobile.length === 0) {
        thisHourMultiplier_Mobile = -1;
      }

      if (isNaN(thisHourMultiplier_Mobile) || (thisHourMultiplier_Mobile < -0.9 && thisHourMultiplier_Mobile > -1) || thisHourMultiplier_Mobile > 3) {
        Logger.log("Mobile bid modifier '" + thisHourMultiplier_Mobile + "' for " + weekDays[dayOfWeek] + " " + hour + " is not valid.");
        thisHourMultiplier_Mobile = 0;
      }

      if (thisHourMultiplier === "") {
        var totalMultiplier = "";
      } else if (thisHourMultiplier == -1 || thisHourMultiplier_Mobile == -1) {
        var totalMultiplier = -1;
      } else {
        var totalMultiplier = (1 + thisHourMultiplier_Mobile) * (1 + thisHourMultiplier) - 1;
      }
      sheet.getRange("I2").setValue(thisHourMultiplier_Mobile);
      sheet.getRange("T2").setValue(totalMultiplier);
      ModifyMobileBidAdjustment(campaignIds, thisHourMultiplier_Mobile);
    }
  }

  // Check the existing ad schedules, removing those no longer necessary
  var existingSchedules = checkAndRemoveAdSchedules(campaignIds, timesAndModifiers);

  // Add in the new ad schedules
  AddHourlyAdSchedules(campaignIds, timesAndModifiers, existingSchedules, shoppingCampaigns);

}


/**
 * Function to add ad schedules for the campaigns with the given IDs, unless the schedules are
 * referenced in the existingSchedules array. The scheduling will be added as a hour long periods
 * as specified in the passed parameter array and will be given the specified bid modifier.
 *
 * @param array campaignIds array of campaign IDs to add ad schedules to
 * @param array timesAndModifiers the array of [hour, day, bid modifier] for which to add ad scheduling
 * @param array existingSchedules array of strings identifying already existing schedules.
 * @param bool shoppingCampaigns using shopping campaigns?
 * @return void
 */
function AddHourlyAdSchedules(campaignIds, timesAndModifiers, existingSchedules, shoppingCampaigns) {
  // times = [[hour,day],[hour,day]]
  var campaignIterator = ConstructIterator(shoppingCampaigns)
    .withIds(campaignIds)
    .get();
  while (campaignIterator.hasNext()) {
    var campaign = campaignIterator.next();
    for (var i = 0; i < timesAndModifiers.length; i++) {
      if (existingSchedules.indexOf(
          timesAndModifiers[i][0] + "|" + (timesAndModifiers[i][0] + 1) + "|" + timesAndModifiers[i][1] +
          "|" + Utilities.formatString("%.2f", (timesAndModifiers[i][2] + 1)) + "|" + campaign.getId()) >
        -1) {

        continue;
      }

      campaign.addAdSchedule({
        dayOfWeek: timesAndModifiers[i][1],
        startHour: timesAndModifiers[i][0],
        startMinute: 0,
        endHour: timesAndModifiers[i][0] + 1,
        endMinute: 0,
        bidModifier: 1 + timesAndModifiers[i][2]
      });
    }
  }
}


/**
 * Function to remove ad schedules from all campaigns referenced in the passed array
 * which do not correspond to schedules specified in the passed timesAndModifiers array.
 *
 * @param array campaignIds array of campaign IDs to remove ad scheduling from
 * @param array timesAndModifiers array of [hour, day, bid modifier] of the wanted schedules
 * @return array existingWantedSchedules array of strings identifying the existing undeleted schedules
 */
function checkAndRemoveAdSchedules(campaignIds, timesAndModifiers) {

  var adScheduleIds = [];

  var report = AdWordsApp.report(
    'SELECT CampaignId, Id ' +
    'FROM CAMPAIGN_AD_SCHEDULE_TARGET_REPORT ' +
    'WHERE CampaignId IN ["' + campaignIds.join('","') + '"]'
  );

  var rows = report.rows();
  while (rows.hasNext()) {
    var row = rows.next();
    var adScheduleId = row['Id'];
    var campaignId = row['CampaignId'];
    adScheduleIds.push([campaignId, adScheduleId]);
  }

  var chunkedArray = [];
  var chunkSize = 10000;

  for (var i = 0; i < adScheduleIds.length; i += chunkSize) {
    chunkedArray.push(adScheduleIds.slice(i, i + chunkSize));
  }

  var wantedSchedules = [];
  var existingWantedSchedules = [];

  for (var j = 0; j < timesAndModifiers.length; j++) {
    wantedSchedules.push(timesAndModifiers[j][0] + "|" + (timesAndModifiers[j][0] + 1) + "|" + timesAndModifiers[j][1] + "|" + Utilities.formatString("%.2f", timesAndModifiers[j][2] + 1));
  }

  for (var i = 0; i < chunkedArray.length; i++) {
    var unwantedSchedules = [];

    var adScheduleIterator = AdWordsApp.targeting()
      .adSchedules()
      .withIds(chunkedArray[i])
      .get();
    while (adScheduleIterator.hasNext()) {
      var adSchedule = adScheduleIterator.next();
      var key = adSchedule.getStartHour() + "|" + adSchedule.getEndHour() + "|" + adSchedule.getDayOfWeek() + "|" + Utilities.formatString("%.2f", adSchedule.getBidModifier());

      if (wantedSchedules.indexOf(key) > -1) {
        existingWantedSchedules.push(key + "|" + adSchedule.getCampaign().getId());
      } else {
        unwantedSchedules.push(adSchedule);
      }
    }

    for (var j = 0; j < unwantedSchedules.length; j++) {
      unwantedSchedules[j].remove();
    }
  }

  return existingWantedSchedules;
}


/**
 * Function to construct an iterator for shopping campaigns or regular campaigns.
 *
 * @param bool shoppingCampaigns Using shopping campaigns?
 * @return AdWords iterator Returns the corresponding AdWords iterator
 */
function ConstructIterator(shoppingCampaigns) {
  if (shoppingCampaigns === true) {
    return AdWordsApp.shoppingCampaigns();
  } else {
    return AdWordsApp.campaigns();
  }
}


/**
 * Function to set a mobile bid modifier for a set of campaigns
 *
 * @param array campaignIds An array of the campaign IDs to be affected
 * @param Float bidModifier The multiplicative mobile bid modifier
 * @return void
 */
function ModifyMobileBidAdjustment(campaignIds, bidModifier) {

  var platformIds = [];

  for (var i = 0; i < campaignIds.length; i++) {
    platformIds.push([campaignIds[i], 30001]);
  }

  var platformIterator = AdWordsApp.targeting()
    .platforms()
    .withIds(platformIds)
    .get();
  while (platformIterator.hasNext()) {
    var platform = platformIterator.next();
    platform.setBidModifier(1 + bidModifier);
  }
}