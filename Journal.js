//const JOURNAL_FIELDS = ["ID", "Account", "Date", "Description", "Amount", "Category"];

function testFormat() {
    var url = 'https://docs.google.com/spreadsheets/d/1k6ApG63WfzGI0IbRjki5QBGnznIwCvEF1OfICthH1Fk/edit#gid=2132421302';
    var ss = SpreadsheetApp.openByUrl(url);
    var sheet = ss.getSheets()[0];
    var format = detectFormat(sheet);
  //  var rows = sheet.getDataRange().getValues();
  //  for (var ri = 0; ri < rows.length; ri++) {
  //    var cols = rows[ri];
  //    var sb = [];
  //    for (var ci = 0; ci < cols.length; ci++) {
  //      sb.push(cols[ci] + "(" + typeof(cols[ci]) + ")");
  //    }
  //    Logger.log(sb.join(","));
  //  }
  }
  
  function testJournal() {
    var url = 'https://docs.google.com/spreadsheets/d/15sI_FUuTLPQIYYvaoB4txIWqftWXspkfcIEcLI13zBI/edit#gid=0';
    var ss = SpreadsheetApp.openByUrl(url);
    var sheet = ss.getSheets()[0];
    var mapIdRow = createIdMap(sheet);
    var newrows = getRows(sheet);
    newrows.push({
      "ID": "THISISNEW",
      "Amount": 6.01,
      "Account": "Amex",
      "Date": new Date(),
      "Description": "Test add",
    });
    newrows = getNewRows(newrows, mapIdRow);
    newrows = transformRowsToValues(newrows, sheet);
    addValuesToSheet(newrows, sheet);
    Logger.log(newrows);
  }
  
  /**
   * Determines how to parse the sheet.
   */
  function detectFormat(sheet, accountName) {
    var format = {
      account : null, // optional account name
      dataLineNo : 0,  // one-based line number where data begins
      headLineNo : 0,  // one-based line number representing column names
      dateColNo : 0,  // one-based column number for date
      spendColNo : 0,  // one-based column number for amount of spent money
      textColNo : 0,  // one-based column number for main description
    };
  
    if (accountName) {
      format.account = accountName;
    }
  
    // first find the header line (if any)
    var rows = sheet.getDataRange().getValues();
    for (var ri = 0; ri < rows.length; ri++) {
      var cols = rows[ri];
      if (!cols[0]) {
        continue;
      }
      Logger.log(cols);
  
      // check to see if all columns are strings
      var columnsAreStrings = true;
      for (var ci = 0; ci < cols.length; ci++) {
        if (typeof(cols[ci]) != "string") {
          columnsAreStrings = false;
        }
      }
      Logger.log("columnsAreStrings = " + columnsAreStrings);
  
      // all columns are strings mean this is the header line    
      if (columnsAreStrings && !format.headLineNo) {
        format.headLineNo = ri + 1;
      } else if (!format.dataLineNo) {
        format.dataLineNo = ri + 1;
        break;
      }
    }
  
    if (!format.dataLineNo) {
      Logger.log("No data!");
      return null;  // no data!
    }
  
    if (format.headLineNo) {  // determine important columns by name
      var names = rows[format.headLineNo - 1];
      for (var ni = 0; ni < names.length; ni++) {
        var name = names[ni];
        if (name.match(/\b(debit|amount)\b/i)) {
          format.SpendColNo = ni + 1;
          Logger.log("Spend Column: " + name + " (" + format.SpendColNo + ")");
        } else if (name.match(/\b(date)\b/i)) {
          format.DateColNo = ni + 1;
          Logger.log("Date Column: " + name + " (" + format.DateColNo + ")");
        } else if (name.match(/\b(description)\b/i)) {
          format.TextColNo = ni + 1;
          Logger.log("Text Column: " + name + " (" + format.TextColNo + ")");
        }
      }
    } else {  // determine important columns by value
      Logger.log("Determine important columns by value");
      for (var ri = format.dataLineNo - 1; ri < rows.length; ri++) {
        if (format.dateColNo && format.spendColNo && format.textColNo) {
          break;
        }
  
        var cols = rows[ri];
        for (var ci = 0; ci < cols.length; ci++) {
          var col = cols[ci];
          if (typeof(col) === "number") {  // may be amount
            if (col > 0 && col.toFixed(3).match(/\.([0-9][1-9]|[1-9][0-9])0$/)) {
              // must have cents but no digits past hundredth place
              format.spendColNo = ci + 1;
            }
          } else if (typeof(col) === "date") {
            format.dateColNo = ci + 1;
          } else if (typeof(col) === "string") {
            if (!format.dateColNo) {
              try {
                var d = new Date(col);
                format.dateColNo = ci + 1;
              } catch (e) {
                // not a date!
              }
            }
            if (!format.textColNo) {
              // to-do: second pass for longest text field
              if (!col.match(/cleared|posted/i) && col.length > 20) {
                format.textColNo = ci + 1;
              }
            }
          }
        }
      }
      Logger.log("Spend Column: " + format.spendColNo);
      Logger.log("Date Column: " + format.dateColNo);
      Logger.log("Text Column: " + format.textColNo);
    }
  
    return format;
  }
  
  /**
   *
   */
  function loadRows(sheet, format) {
    if (!format) {
      format = detectFormat(sheet);
    }
  }
  
  function addValuesToSheet(values, sheet) {
    if (!values.length) {
      return; // don't try to add "no values" (.length throws exception)
    }
    var rowNum = sheet.getLastRow() + 1;
    var totalRows = values.length;
    var totalColumns = values[0].length;
    // alternatively could call appendRow() per row to add
    sheet.getRange(rowNum, 1, totalRows, totalColumns).setValues(values);
  }
  
  function getRows(sheet) {
    // retrieve headers
    var rows = sheet.getDataRange().getValues();
    var header = rows[0];
    var new_rows = [];
    for (var ri = 1; ri < rows.length; ri++) {
      var new_row = {};
      for (var ci = 0; ci < header.length; ci++) {
        new_row[header[ci]] = rows[ri][ci];
      }
      new_rows.push(new_row);
    }
    return new_rows;
  }
  
  function getColumnIndex(sheet, name) {
    var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    return header.indexOf(name);
  }
  
  /*
   * Returns dictionary object for ID => row_number mapping.
   *
  */
  function createIdMap(sheet) {
    var indexId = getColumnIndex(sheet, "ID");
    Logger.log("ID = " + indexId);
    var range = sheet.getRange(2, indexId + 1, sheet.getLastRow() - 1, 1);
    var rows = range.getValues();
    var map = {};
    for (var ri = 0; ri < rows.length; ri++) {
      map[rows[ri][0]] = ri + 2; // 1-based row number (+header)
    }
    return map;
  }
  
  /*
   * Returns new data to be appended to journal.
   *
   * @param {Array} rows Array of objects representing rows of data.
   * @param {Object} mapIdRow ID to row number map from existing data.
   */
  function getNewRows(rows, mapIdRow) {
    if (!mapIdRow) {
      return data; // adding everything if no pre-existing map
    }
  
    var new_rows = [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var existing_row_number = mapIdRow[row.ID];
      if (existing_row_number) {
        continue;
      }
      new_rows.push(row);
    }
  
    return new_rows;
  }
  
  /*
   * Converts row objects into journal row / column matrix.
   */
  function transformRowsToValues(rows, sheet) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var new_rows = [];
  
    for (var ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      var new_row = Array();
      for (var hi = 0; hi < headers.length; hi++) {
        var header = headers[hi];
        new_row.push(row[header]);
      }
      new_rows.push(new_row);
    }
  
    return new_rows;
  }
  
  /*
   * Adds data to a journal sheet.
   * 
   * @param {Array} rows Array of objects representing rows of data.
   * @param {Object} mapIdRow ID to row number map from existing data.
   * @return {Integer} Count of added rows.
   */
  function importJournalData(rows, sheet, mapIdRow) {
    var new_rows = transformRows(getNewRows(rows), sheet);
    var range = sheet.getRange(sheet.getLastRow(), 1, new_rows.length);
    range.setValues(new_rows);
    return new_rows.length;
  }
  