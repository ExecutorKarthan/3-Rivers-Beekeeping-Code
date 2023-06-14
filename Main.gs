function Main() {

//Build a class to organize all the data
class beeKeeper{
  constructor(firstName, lastName, phoneNumber, email, county, firstYearBeekeeping, yearsBeekeeping, numberOfHives){
    this.firstName =   firstName;
    this.lastName = lastName;
    this.phoneNumber = phoneNumber;
    this.email = email;
    this.county = county;
    this.firstYearBeekeeping = firstYearBeekeeping;
    this.yearsBeekeeping = yearsBeekeeping;
    this.numberOfHives = numberOfHives;
  }
}
//Add feature to update information
  //Access the sheet and set up variables for ease of use
  var attendanceSheet = SpreadsheetApp.openByUrl("Standin for actual website used");
  var membershipListSheet = attendanceSheet.getSheetByName("Membership List").getDataRange();
  var attendanceArchiveSheet = attendanceSheet.getSheetByName("Attendance Archive").getDataRange();
  var rawAttendanceSheet = attendanceSheet.getSheetByName("Raw Attendance").getDataRange();
  var toEmailAddressArray = ["Standin for email address"];
  var phoneNumberArray = [];
  
  //Establish ending row for the datasheets 
  var lastRow_MembershipList = membershipListSheet.getLastRow()-1;
  var lastRow_AttendanceArchive = attendanceArchiveSheet.getLastRow()-1;
  var lastRow_RawAttendance = rawAttendanceSheet.getLastRow()-1;

  //Create time constrains that pulls notable data
  var now = new Date()
  var yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate()-1, now.getHours(), now.getMinutes(), now.getSeconds());
  //Create a version of "now" for testing
  //now.setMonth(now.getMonth()+1)
  //Create a version of yesterday
  yesterday.setMonth(now.getMonth()-1)
  var timestamp = new Date(Date.parse(rawAttendanceSheet.getValues()[lastRow_RawAttendance-1][0]));

  //Pull the most recent data, then make a map linking the phone numbers to the timestamps
  var recentMeetingToProcess = new Map();
  for(var row = lastRow_RawAttendance; row > 0; row = row - 1){
    timestamp = new Date(Date.parse(rawAttendanceSheet.getValues()[row][0]));
    //If it is a returning member, just take the phone number and timestamp
    var rowData = rawAttendanceSheet.getValues()[row];
    if(timestamp < now && timestamp > yesterday && rawAttendanceSheet.getValues()[row][2] =="No" && recentMeetingToProcess.get(rawAttendanceSheet.getValues()[row][1]) == null){
      console.log("Time stamp is within limits. Pushing data to processing Map");
      recentMeetingToProcess.set(rawAttendanceSheet.getValues()[row][1], [timestamp, rowData[2]]);
    }
    //If it is a new member, collect all the data
    else if(timestamp < now && timestamp > yesterday && rawAttendanceSheet.getValues()[row][2] =="Yes" ){
      console.log("Time stamp is within limits and this is a first-timer. Collecting data.");
      var phoneNumberKey = rawAttendanceSheet.getValues()[row][1];
      if(isNaN(rawAttendanceSheet.getValues()[row][1]) && rawAttendanceSheet.getValues()[row][1] != "Phone Number"){
       var originalString = rawAttendanceSheet.getValues()[row][1];
       const regex = new RegExp('[0-9]')
       var processedValue = "";
       for(var value = 0; value < originalString.length; value++){
         if(regex.test(originalString[value]) == true){
           processedValue = processedValue + originalString[value]
          }
        }
        processedValue = Number(processedValue);
        phoneNumberKey = processedValue;
      }
      recentMeetingToProcess.set(phoneNumberKey, [rowData[0], rowData[2], rowData[3], rowData[4], rowData[5], rowData[6], rowData[7],rowData[8],rowData[9]]);
    }
    else{
      continue;
    }
  }

  //Create a map of the membership list and attendance list for reference
  var memberMap = new Map();
  var memberLocationMap = new Map();
  var membershipList = membershipListSheet.getValues()
  membershipList.forEach((dataArray, index) => {
      memberMap.set(dataArray[2], new beeKeeper(dataArray[0],dataArray[1], dataArray[2], dataArray[3], dataArray[4], dataArray[5],dataArray[6],dataArray[7], dataArray[8],dataArray[9]))
        memberLocationMap.set(dataArray[2], index+1)
  })
  

  //Create a map of attendance from the archive
  var attendanceRecordMap = new Map();
  var attendanceLocationMap = new Map();
  var attendanceList = attendanceArchiveSheet.getValues();
  attendanceList.forEach((array, index) => {
    var filteredArray = array.filter(value => typeof(value) != "string")
    var finalArray = filteredArray.slice(1)
    attendanceRecordMap.set(array[0], finalArray);
    attendanceLocationMap.set(array[0], index)
  })
  memberMap.delete("Phone Number");
  attendanceRecordMap.delete("Phone Number");
  attendanceLocationMap.delete("Phone Number");

  //If there is a new entry to the club, add them to the membership list and update the map. If the member exists, update their attendance 
  recentMeetingToProcess.forEach((value, key) => {
    //Update member information
    if(memberMap.get(key) != null && value[1] == "Yes"){
      var tStamp = value.splice(0, 1);
      var firstEntry = value.splice(0, 1);
      value.splice(2, 0, key)
      var setMemberData = attendanceSheet.getSheetByName("Membership List").getRange(memberLocationMap.get(key), 1, 1, 8).setValues([value])
      memberMap.set(key, new beeKeeper(value[0], value[1], value[2], value[3], value[4],value[5],value[6],value[7]));
    }
    //New member - add to member sheet and update their attendance
    if(memberMap.get(key) == null && value[1] == "Yes"){
      var tStamp = value.splice(0, 1);
      var firstEntry = value.splice(0, 1);
      value.splice(2, 0, key)
      var setMemberData = attendanceSheet.getSheetByName("Membership List").getRange(lastRow_MembershipList+2, 1, 1, 8).setValues([value])
      memberMap.set(key, new beeKeeper(value[0], value[1], value[2], value[3], value[4],value[5],value[6],value[7]));
      lastRow_MembershipList = lastRow_MembershipList + 1
      memberLocationMap.set(key, lastRow_MembershipList)
      attendanceRecordMap.set(key, tStamp)
      var setAttendanceData = attendanceSheet.getSheetByName("Attendance Archive").getRange(lastRow_AttendanceArchive+2, 1, 1, 2).setValues([[key, attendanceRecordMap.get(key)]]);
      lastRow_AttendanceArchive = lastRow_AttendanceArchive + 1
    }
    //Handle error - person submits phone number without have a member entry
    if(memberMap.get(key) == null && value[1] == "No"){
     phoneNumberArray.push(key)
    }
    //Update attendance on current member
    if(memberMap.get(key) != null && value[1] == "No"){
        var updatedAttendance = attendanceRecordMap.get(key)
      var attendancePush = updatedAttendance.unshift(value[0])
      attendanceRecordMap.set(key, updatedAttendance)
      var setAttendanceData = attendanceSheet.getSheetByName("Attendance Archive").getRange(attendanceLocationMap.get(key)+1, 2, 1, attendanceRecordMap.get(key).length).setValues([attendanceRecordMap.get(key)]);
      }
    else{
      console.log("Unknown error occured. Logic failure occured where member is neither in the membership map and the second value is not a 'Yes' or a 'No'.")
    }
  })

  //Send email if there are untethered numbers
  if(phoneNumberArray.length > 0){
     //autoEmailer(toEmailAddressArray, phoneNumberArray)
     console.log("There are loose emails!" + phoneNumberArray)
  }

  //Go through each row of the attendance archive and determine attendance membership
  attendanceRecordMap.forEach((values, key) =>{
    var numInLast12 = 0;
    var date12Month = new Date(now.getFullYear()-1, now.getMonth(), 15, now.getHours(), now.getMinutes(), now.getSeconds());
    values.forEach(date =>{
      if(date > date12Month){
        numInLast12 = numInLast12+1
      }
    })
    if(numInLast12 > 2){
      var setMemberData = attendanceSheet.getSheetByName("Membership List").getRange(memberLocationMap.get(key), 10, 1, 2).setValues([["Yes", numInLast12]])
    }
    else if(memberLocationMap.get(key) == null){
      console.log("Member not found in Map during attendance record update. Number in question is: " + key)
    }
    else{
      var setMemberData = attendanceSheet.getSheetByName("Membership List").getRange(memberLocationMap.get(key), 10, 1, 2).setValues([["No", numInLast12]])
    }
  })
  historicalUpdate();
  DeleteTimers();
  var form = FormApp.openById('1_w8YxwGWqJf2xl_Z2RVDYHwBl906FocTAkPh8ve94cs');
  ScriptApp.newTrigger('SetTimer').forForm(form).onFormSubmit().create();
  console.log("End")
}
