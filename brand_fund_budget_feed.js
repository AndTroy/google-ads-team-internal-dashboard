/**
 * Brand Fund Budget Feed
 * Runs in the Tommy's Express Brand Fund Google Ads account (daily, early morning).
 * Writes one row per Brand Fund Search campaign (PayPerWash, Regional/Unlimited, Fleet)
 * to the "Campaign Feed" tab of the "Brand Fund Budget Feed" Google Sheet:
 * status, current daily budget, and spend from the 1st of the month through yesterday.
 * The Brand Fund dashboard reads that tab. Nothing in Google Ads is changed.
 *
 * "Budget Feed" (monthly budget per campaign type, copied from the 2026 PMT Annual Plan)
 * and "Region Sites" (open sites per region, from Yext) are only seeded here when the
 * tab is missing or empty; after that they are maintained by hand / by the budget sync.
 */
var SHEET_ID = '1hO_Xx_r7frixi6WNOJuRt2T6XA0LZQbdd0mVPeTO5tY';
var NAME_FILTER = "Brand Fund |";

var CAMPAIGN_HEADERS = ['As Of', 'Through', 'Month', 'Campaign', 'Group', 'Region', 'Status', 'Daily Budget', 'Month-to-Date Spend'];

function classify(name) {
  if (name.indexOf('PayPerWash') !== -1) return 'PPW Search';
  if (name.indexOf('Regional Search') !== -1) return 'Unlimited Search';
  if (name.indexOf('Fleet Search') !== -1) return 'Fleet Search';
  return null;   // anything else (e.g. Tunnel of Terror) is left out
}

function regionOf(name) {
  var parts = name.split('|');
  return parts.length > 1 ? parts[1].trim() : '';
}

function getOrCreateTab(ss, name) {
  var sh = ss.getSheetByName(name);
  if (sh) return sh;
  if (name === 'Campaign Feed' && ss.getSheets().length === 1 && ss.getSheets()[0].getName() === 'Sheet1' &&
      ss.getSheets()[0].getLastRow() === 0) {
    var s1 = ss.getSheets()[0];
    s1.setName(name);
    return s1;
  }
  return ss.insertSheet(name);
}

function seedIfEmpty(ss, name, rows) {
  var sh = ss.getSheetByName(name);
  if (sh && sh.getLastRow() > 0) return;
  if (!sh) sh = ss.insertSheet(name);
  var range = sh.getRange(1, 1, rows.length, rows[0].length);
  range.setNumberFormat('@');          // keep months / dates as text, not auto-converted dates
  range.setValues(rows);
  sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
}

function main() {
  var tz = AdsApp.currentAccount().getTimeZone();
  var now = new Date();
  var through = Utilities.formatDate(new Date(now.getTime() - 86400000), tz, 'yyyy-MM-dd');
  var asOf = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  var month = through.slice(0, 7);
  var from = month + '-01';

  var camps = {};
  var q1 = "SELECT campaign.id, campaign.name, campaign.status, campaign.serving_status, campaign_budget.amount_micros " +
           "FROM campaign WHERE campaign.status IN ('ENABLED', 'PAUSED') AND campaign.name LIKE '" + NAME_FILTER + "%'";
  var it1 = AdsApp.search(q1);
  while (it1.hasNext()) {
    var r = it1.next();
    var name = r.campaign.name;
    var group = classify(name);
    if (!group) continue;
    var status = r.campaign.status === 'ENABLED' ? 'Active' : 'Paused';
    if (r.campaign.servingStatus === 'ENDED') status = 'Ended';
    camps[r.campaign.id] = {
      name: name, group: group, region: regionOf(name), status: status,
      daily: Number(r.campaignBudget.amountMicros || 0) / 1e6, spend: 0
    };
  }

  var q2 = "SELECT campaign.id, metrics.cost_micros FROM campaign " +
           "WHERE segments.date BETWEEN '" + from + "' AND '" + through + "' AND campaign.name LIKE '" + NAME_FILTER + "%'";
  var it2 = AdsApp.search(q2);
  while (it2.hasNext()) {
    var r2 = it2.next();
    var c = camps[r2.campaign.id];
    if (c) c.spend += Number(r2.metrics.costMicros || 0) / 1e6;
  }

  var rows = [CAMPAIGN_HEADERS];
  Object.keys(camps).map(function(k) { return camps[k]; })
    .sort(function(a, b) { return a.group.localeCompare(b.group) || a.region.localeCompare(b.region); })
    .forEach(function(c) {
      rows.push([asOf, through, month, c.name, c.group, c.region, c.status,
                 Math.round(c.daily * 100) / 100, Math.round(c.spend * 100) / 100]);
    });

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = getOrCreateTab(ss, 'Campaign Feed');
  sh.clear();
  sh.getRange(1, 1, rows.length, 7).setNumberFormat('@');   // text columns (dates, names, status)
  sh.getRange(1, 8, rows.length, 2).setNumberFormat('0.00');
  sh.getRange(1, 1, rows.length, CAMPAIGN_HEADERS.length).setValues(rows);
  sh.getRange(1, 1, 1, CAMPAIGN_HEADERS.length).setFontWeight('bold');
  sh.setFrozenRows(1);

  seedIfEmpty(ss, 'Budget Feed', [
    ['Month', 'Group', 'Budget'],
    ['2026-11', 'PPW Search', '2640.02'],
    ['2026-11', 'Unlimited Search', '10000.00'],
    ['2026-11', 'Fleet Search', '1359.98']
  ]);
  seedIfEmpty(ss, 'Region Sites', [
    ['Region', 'Open Sites', 'As Of'],
    ['Central', '41', '2026-11-13'],
    ['Midwest', '89', '2026-11-13'],
    ['Northeast', '18', '2026-11-13'],
    ['Southeast', '67', '2026-11-13'],
    ['Southwest', '54', '2026-11-13'],
    ['West', '13', '2026-11-13']
  ]);

  Logger.log('Brand Fund Budget Feed: wrote ' + (rows.length - 1) + ' campaigns for ' + month + ' (through ' + through + ')');
}
