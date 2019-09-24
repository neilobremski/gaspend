function myFunction() {
    var map = {};
    var a = new Array();
    a[5] = "Hello";
    Logger.log(a.join(","));
    return "it works!";
  }
  
  function test() {
    // blah blah blah
    Logger.log("Loading Sheet");
    console.time("sheet");
    var url = "https://docs.google.com/spreadsheets/d/1Zswp1uSXU_K_vIQwMdSrKSrwmkhEHVC3RqSeeZwLicg/";
    var gs = SpreadsheetApp.openByUrl(url);
    Logger.log("Get Active Sheet");
    var sheet = gs.getActiveSheet();
    Logger.log("Get Range");
    var range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
    Logger.log("Get Values");
    var values = range.getValues();
    for (var row = 0; row < values.length; row++) {
      var line = "";
      for (var col = 0; col < values[row].length; col++) {
        line += values[row][col];
        line += " ";
      }
      Logger.log(line);
    }
  
    console.timeEnd("sheet");
    Logger.log("Finished " + values.length);
  }