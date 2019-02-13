function Control (SUBID) {
    // Usage
    // 1. Enter sheet name where data is to be written below
    // 1. Enter sheet name and key where data is to be written below
    var geoIDs = {'Alaska':'21132','Alabama':'21133','Arkansas':'21135','Arizona':'21136','California':'21137','Colorado':'21138','Connecticut':'21139',
        'District of Columbia':'21140','Delaware':'21141','Florida':'21142','Georgia':'21143','Hawaii':'21144','Iowa':'21145','Idaho':'21146',
        'Illinois':'21147','Canada':'2124','United States':'2840','France':'2250','Indiana':'21148','Kansas':'21149','Kentucky':'21150','Louisiana':'21151','Massachusetts':'21152','Maryland':'21153',
        'Maine':'21154','Michigan':'21155','Minnesota':'21156','Missouri':'21157','Mississippi':'21158','Montana':'21159','North Carolina':'21160',
        'North Dakota':'21161','Nebraska':'21162','New Hampshire':'21163','New Jersey':'21164','New Mexico':'21165','Nevada':'21166','New York':'21167',
        'Ohio':'21168','Oklahoma':'21169','Oregon':'21170','Pennsylvania':'21171','Rhode Island':'21172','South Carolina':'21173','South Dakota':'21174',
        'Tennessee':'21175','Texas':'21176','Utah':'21177','Virginia':'21178','Vermont':'2, 1179','Washington':'21180','Wisconsin':'21182','West Virginia':'21183','Wyoming':'21184'}
    var SHEET_NAME = "Data";

    var SHEET_KEY = "asdasdasd";
    var apiURL = "https://script.google.com/macros/s/AKfycbysaTdradasdasasdasdasdMEkFk1Q5bFtlNcEgK/exec";

    this.main = function(SUBID) {

        var sheet = SpreadsheetApp.openById(SHEET_KEY).getSheetByName(SHEET_NAME);
        var archive = SpreadsheetApp.openById(SHEET_KEY).getSheetByName("Archive");
        var range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
        var clientID = AdWordsApp.currentAccount().getCustomerId();
        var clietIDs = range.map(function (i) {return i[1]});
        var status = range.map(function (i) {return i[2]});
        var campaigns = range.map(function (i) {return i[4]});
        var spreadsheets = range.map(function (i) {return i[5]});
        var periods = range.map(function (i) {return i[13]});
        var clientIndex = clietIDs.indexOf(clientID)
        var archiveData = archive.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
        var archiveClients = archiveData.map(function (i) {return i[1]});

        if (clientIndex == -1 && archiveClients.indexOf(clientID) == -1) {
            newAccount(SUBID, periods[clientIndex]);
            Logger.log("New account has been added to Control Spreadsheet")
        } else if (archiveClients.indexOf(clientID) == -1) {
            var isUpdate = 0;
            if (status[clientIndex] == "New") {
                Logger.log("New account without changing, change status to 'Update' for campaign deploy");
                isUpdate = 1;
            }
            if (status[clientIndex] == "Update") {
                updateAccount(spreadsheets[clientIndex], campaigns[clientIndex]);
                isUpdate = 1;
            }
            if (status[clientIndex] == "Live" || status[clientIndex] == "No impressions") {
                checkAccount(clientIndex, SUBID, periods[clientIndex]);
                isUpdate = 1;
            };
            if (status[clientIndex] == "Remove") {
                removeAccount(clientIndex);
                isUpdate = 1;
            };
            if (isUpdate == 0) {
                Logger.log("Incorrect account status");
            }
        }
    }

    function removeAccount (rowIndex) {

        var data = {
            "method" : "remove",
            "row" : rowIndex + 1
        }
        Logger.log(apiURL + "?" +  encodeQueryData(data));
        var req = UrlFetchApp.fetch(apiURL + "?" + encodeQueryData(data));
        Logger.log(req.getContentText())
    }

    function checkAccount (rowIndex, SUBID, period) {

        if (period == "undefined") {
            period = "ALL_TIME";
        }
        Logger.log(period);

        var data = {
            "method" : "check",
            "row" : rowIndex + 1,
            "Account ID" : AdWordsApp.currentAccount().getCustomerId(),
            "Account Name" : AdWordsApp.currentAccount().getName(),
            "Status" : accountStatus(),
            "SUBID": SUBID || "No SUBID",
            "Spend" : (stats !== undefined) ?  stats.getCost() : 0,
            "Clicks" : (stats !== undefined) ? stats.getClicks() : 0,
            "Impressions" : (stats !== undefined) ? stats.getImpressions() : 0,
            "CPC" : (stats !== undefined) ? stats.getAverageCpc() : 0,
            "CTR" : (stats !== undefined) ? stats.getCtr() : 0,
            "Ad Serving" : adServing()
        };

        Logger.log(apiURL + encodeQueryData(data));
        var req = UrlFetchApp.fetch(apiURL + "?" + encodeQueryData(data));
        Logger.log(req.getContentText())
    }

    function updateAccount (url, campaignFilter) {
        Logger.log(url);
        var spreadsheet = SpreadsheetApp.openByUrl(url);
        var settingSheet = spreadsheet.getSheetByName("Campaign Settings");
        var keywordsSheet = spreadsheet.getSheetByName("Data");
        var campaigns = transformDataObj(settingSheet);

        createCampaign(campaigns, campaignFilter);
        Utilities.sleep(1000);
        updateCampaign(campaigns, keywordsSheet, campaignFilter);
    }

    function updateCampaign (campaigns, data, campaignFilter) {

        var existingAds = currentAds();
        Logger.log(existingAds)
        //var build = [];
        var preview = AdWordsApp.getExecutionInfo().isPreview()
        var checkedCampaigns = {}
        for (var i in campaigns) {

            var device = campaigns[i]["Device"];
            var location = campaigns[i]["Target location"];
            var maxCPC = campaigns[i]["Max CPC"];
            var campName = campaigns[i]["Campaign Name"];

            if (!checkedCampaigns[campName]) {
                checkedCampaigns[campName] = campaignCheck(campName, campaignFilter)
            }

            Logger.log(campaignCheck(campName, campaignFilter))

            if (checkedCampaigns[campName] && !preview) {

                var campaign = AdWordsApp.campaigns().withCondition('Name = "'+campName+'"').get().next();
                if (device == 'Desktop') {
                    campaign.targeting().platforms().mobile().get().next().setBidModifier(0);
                }
                campaign.addLocation(geoIDs[location]);
            }
        }

        var columnsAdgroups = ['Campaign', 'Ad group', 'Bid Strategy type', 'Default max. CPC'];
        var columnsKeywords = ['Campaign', 'Ad group', 'Keyword' ];
        var columnsAds = ['Campaign', 'Ad group', 'Headline 1', 'Headline 2', 'Description', 'Path 1', 'Path 2', 'Final URL' ];

        var values = data.getRange(2, 1, data.getLastRow()-1, data.getLastColumn()).getValues();
        //var headers
        var uploadAdgroup = AdWordsApp.bulkUploads().newCsvUpload( columnsAdgroups, {moneyInMicros: false});
        var uploadKeyword = AdWordsApp.bulkUploads().newCsvUpload( columnsKeywords, {moneyInMicros: false});
        var uploadAds = AdWordsApp.bulkUploads().newCsvUpload( columnsAds, {moneyInMicros: false});

        for (var i in values) {

            [Campaign, Keyword, Headline1, Headline2, Description, Path1, Path2, FinalUrl] = values[i];

            if (!checkedCampaigns[Campaign]) {
                checkedCampaigns[Campaign] = campaignCheck(Campaign, campaignFilter)
            }

            if (checkedCampaigns[Campaign]) {
                uploadAdgroup.append({ 'Campaign': Campaign, 'Ad group': Keyword, 'Bid Strategy type': 'cpc', 'Default max. CPC' : 1 });
                uploadAds.append({ 'Campaign': Campaign, 'Ad group': Keyword, 'Headline 1': Headline1, 'Headline 2': Headline2, 'Description': Description, 'Path 1': Path1, 'Path 2': Path2, 'Final URL' : FinalUrl.replace(/\s/g,'%20')});
                criterionTypes(Keyword).forEach(function (k) {uploadKeyword.append({ 'Campaign': Campaign, 'Ad group': Keyword,'Keyword': k });})
            }
        }

        uploadAdgroup.forCampaignManagement().setFileName("AdGroups Upload").apply();
        Utilities.sleep(5000);
        uploadAds.forCampaignManagement().setFileName("Ads Upload").apply();
        Utilities.sleep(5000);
        uploadKeyword.forCampaignManagement().setFileName("Keyword Upload").apply();
    }



    function criterionTypes (keyword) {
        // Comment variable if needed
        var broad = keyword;
        var phrase = "\""+keyword+"\"";
        var exact = "["+keyword+"]";
        var modifier = "+"+keyword.replace(/\s/g, " +");

        return [broad, phrase, exact, modifier].filter(function(n){ return n != undefined });

    }


    function currentAds() {
        var r = {};
        var report = AdWordsApp.report(
            "SELECT CampaignName, AdGroupName, HeadlinePart1, HeadlinePart2, Description " +
            "FROM AD_PERFORMANCE_REPORT " +
            "WHERE CampaignStatus = ENABLED " +
            "AND AdType = EXPANDED_TEXT_AD " +
            "AND AdGroupStatus = ENABLED " +
            "AND Status = ENABLED"
        ).rows();

        while (report.hasNext()) {
            var row = report.next();

            //Logger.log(row.formatForUpload());
            var c = row.CampaignName;
            var g = row.AdGroupName;
            var a = row.HeadlinePart1 +" "+row.HeadlinePart2 +" "+row.Description;
            if (!r[c]) {r[c] = {};}
            if (!r[c][g]) {r[c][g] = [];}
            r[c][g].push(a);
        }
        //Logger.log(r);
        // r = {CampaignName: {Adgroup : [head1, head2, desc],[],...}, ...}
        return r;
    }

    function createCampaign (campaigns, campaignFilter) {

        //Logger.log(campaigns);
        var existingAds = currentAds();
        var columns = ['Campaign', 'Budget', 'Bid Strategy type', 'Campaign type', 'Campaign subtype', 'Action'];

        var upload = AdWordsApp.bulkUploads().newCsvUpload(
            columns, {moneyInMicros: false});

        for (var i in campaigns) {
            var campName = campaigns[i]["Campaign Name"]
            if (!existingAds[campaigns[i]["Campaign Name"]] && campaignCheck(campName, campaignFilter)) {
                // AdWords identify existing campaigns using its name. To create a new
                // campaign, use a campaign name that doesn't exist in your account.
                upload.append({
                    'Campaign': campName,
                    'Budget': campaigns[i]["Budget"],
                    'Bid Strategy type': 'cpc',
                    'Campaign type': 'Search Only',
                    'Campaign subtype' : 'All features',
                    'Action' : 'add'
                });
            }
        }
        // Use upload.apply() to make changes without previewing.
        upload.forCampaignManagement().setFileName("Campaign Upload").apply();
    }

    function newAccount (SUBID) {
        if (AdWordsApp.campaigns().get().hasNext()) {
            var stats = AdWordsApp.currentAccount().getStatsFor("ALL_TIME");
        } else {
            var stats;
        }


        var data = {
            "method" : "new",
            "Account ID" : AdWordsApp.currentAccount().getCustomerId(),
            "Account Name" : AdWordsApp.currentAccount().getName(),
            "Status" : "New",
            "Campaign" : "Set campaign temlate",
            "SUBID": SUBID || "No SUBID",
            "Sheet Template" : "Account settings " + AdWordsApp.currentAccount().getCustomerId(),
            "Spend" : (stats !== undefined) ?  stats.getCost() : 0,
            "Clicks" : (stats !== undefined) ? stats.getClicks() : 0,
            "Impressions" : (stats !== undefined) ? stats.getImpressions() : 0,
            "CPC" : (stats !== undefined) ? stats.getAverageCpc() : 0,
            "CTR" : (stats !== undefined) ? stats.getCtr() : 0,
            "Ad Serving" : 0
        };

        Logger.log(apiURL + encodeQueryData(data));
        var req = UrlFetchApp.fetch(apiURL + "?" + encodeQueryData(data));
        Logger.log(req.getContentText())
    }

    //https://stackoverflow.com/questions/111529/how-to-create-query-parameters-in-javascript
    function encodeQueryData(data) {
        var ret = [];
        for (var d in data) {
            ret.push(d + '=' + data[d]);
        }
        return ret.join('&');
    }

    function transformDataObj (sheet) {
        var data = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
        var header = data.shift();

        var obj = data.map(function(values) {
            return header.reduce(function(o, k, i) {
                o[k] = values[i];
                return o;
            }, {});})
        return obj
    }

    function sheetValues (sheet) {
        return sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
    }

    function adServing () {
        var n = 0;
        var r = {};
        var output = [];

        var report = AdWordsApp.report(
            "SELECT CombinedApprovalStatus " +
            "FROM AD_PERFORMANCE_REPORT " +
            "WHERE CampaignStatus = ENABLED " +
            "AND AdGroupStatus = ENABLED " +
            "AND Status = ENABLED"
        ).rows();

        while (report.hasNext()) {
            var row = report.next();
            var status = row["CombinedApprovalStatus"];
            if (!r[status]) {
                r[status] = 0;
            }
            r[status]++
            n++
        }
        for (var i in r) {
            r[i] = percent(n, r[i]);
            output.push(i+" : "+r[i])
        }
        return output.join(",");
    }


    function percent (a, b) {
        return Math.floor((b / a) * 100);
    }

    function accountStatus() {
        var dates = getDateInThePast();
        var checkdate = last6HoursDates();
        var imp = 0;
        var status;

        if (AdWordsApp.campaigns().get().totalNumEnteties() == 0) {
            status = "No impressions";

        } else {
            var report = AdWordsApp.report(
                "SELECT Date, Impressions, HourOfDay " +
                "FROM ACCOUNT_PERFORMANCE_REPORT " +
                "DURING " + dates
            ).rows();
            while(report.hasNext()) {
                var r = report.next();
                var hour = r.HourOfDay;
                var date = r.Date;
                if (checkdate.indexOf(hour+","+date) !== -1) {
                    imp += parseInt(r.Impressions)
                }
            }
            Logger.log(imp);
            if (imp == 0) {
                status = "No impressions";
            } else if (imp > 0) {
                status = "Live";
            }
        }
        return status;
    }

    function getDateInThePast() {

        var MILLIS_PER_DAY = 1000 * 60 * 60 * 6;
        var date = new Date();
        var timeZone = AdWordsApp.currentAccount().getTimeZone();
        var format = 'yyyyMMdd';
        var currentHour = "H";

        var date6HoursAgo = Utilities.formatDate(new Date(date.getTime() - MILLIS_PER_DAY), timeZone, format);
        var today = Utilities.formatDate(date, timeZone, format);

        return date6HoursAgo +","+ today;
    }

    function last6HoursDates () {
        var MILLIS_PER_DAY = 1000 * 60 * 60;
        var date = new Date();
        var timeZone = AdWordsApp.currentAccount().getTimeZone();
        var format = "yyyy-MM-dd";
        var currentHour = "H";
        var result = [];

        for (var i = 0; i < 6; i++) {
            var dateX = Utilities.formatDate(new Date(date.getTime() - MILLIS_PER_DAY * i), timeZone, format);
            var hourX = Utilities.formatDate(new Date(date.getTime() - MILLIS_PER_DAY * i), timeZone, currentHour);
            //Logger.log(hourX +","+dateX);
            result.push(hourX +","+dateX);
        }
        return result;
    }

    function campaignCheck (campName, campaignFilter) {
        var check = false;
        //Logger.log("Проверка кампании "+campName+" "+campaignFilter)
        if (campaignFilter == "" || campaignFilter == 'Set campaign template') {
            check = true
        } else {
            var condition = campaignFilter.toLowerCase().split(';');

            if (condition.indexOf(campName.toLowerCase()) !== -1) {
                check = true
            } else if (!check && condition.length > 0) {
                var name = campName.toLowerCase();
                for (var i in condition) {
                    if (name.indexOf(condition[i]) !== -1) {
                        check = true;
                        return check
                    }
                }
            }
        }
        return check
    }

    function getCampaignIds(campaigns) {
        var campaignNameContains = campaigns.split(';')
        var whereStatement = "WHERE CampaignStatus IN ['ENABLED','PAUSED'] ";
        var whereStatementsArray = [];
        var campData = {};
        /*
        for (var i=0; i<campaignNameDoesNotContain.length; i++) {
          whereStatement += "AND CampaignName DOES_NOT_CONTAIN_IGNORE_CASE '" + campaignNameDoesNotContain[i].replace(/"/g,'\\\"') + "' ";
        }
        */
        if (campaignNameContains.length == 0) {
            whereStatementsArray = [whereStatement];
        } else {
            for (var i=0; i<campaignNameContains.length; i++) {
                whereStatementsArray.push(whereStatement + 'AND CampaignName CONTAINS_IGNORE_CASE "' + campaignNameContains[i].replace(/"/g,'\\\"') + '" ');
            }
        }

        for (var i=0; i<whereStatementsArray.length; i++) {
            var report = AdWordsApp.report(
                "SELECT CampaignId, CampaignName, CampaignStatus, Amount, Labels, LabelIds, Cost " +
                "FROM   CAMPAIGN_PERFORMANCE_REPORT " +
                whereStatementsArray[i] +
                "AND AdvertisingChannelType IN ['SEARCH', 'DISPLAY'] " +
                "DURING TODAY");

            var rows = report.rows();
            while (rows.hasNext()) {
                var row = rows.next();
                //var budget = parseFloat(row['Amount'].replace(/,/g, ""));
                //var spend = parseFloat(row['Cost'].replace(/,/g, ""));
                var campaignId = row['CampaignId'];

                campData[campaignId] = campaignId;
                /*
                  {CampaignId : campaignId,
                   CampaignName : row['CampaignName'],
                   CampaignStatus : row['CampaignStatus'],
                   Spend : spend,
                   Budget : budget,
                   Labels : row['Labels'],
                   LabelId : row['LabelIds']
                  };
                  */
            }
        }

        var campaignIds = Object.keys(campData);
        if (campaignIds.length == 0) {
            throw("No campaigns found with the given settings.");
        }
        Logger.log(campaignIds.length + " campaigns found");

        return campaignIds;
    }
}