/* ***** BEGIN LICENSE BLOCK *****
 * Version: GPL 3.0
 *
 * The contents of this file are subject to the General Public License
 * 3.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.gnu.org/licenses/gpl.html
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * -- Exchange 2007/2010 Calendar and Tasks Provider.
 * -- For Thunderbird with the Lightning add-on.
 *
 * Author: Michel Verbraak (info@1st-setup.nl)
 * Website: http://www.1st-setup.nl/wordpress/?page_id=133
 * email: exchangecalendar@extensions.1st-setup.nl
 *
 *
 * This code uses parts of the Microsoft Exchange Calendar Provider code on which the
 * "Exchange Data Provider for Lightning" was based.
 * The Initial Developer of the Microsoft Exchange Calendar Provider Code is
 *   Andrea Bittau <a.bittau@cs.ucl.ac.uk>, University College London
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * ***** BEGIN LICENSE BLOCK *****/
var Cu = Components.utils;
var Ci = Components.interfaces;
var Cc = Components.classes;

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

function exchangeEventDialog(aDocument, aWindow)
{
	this._document = aDocument;
	this._window = aWindow;

	this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
				.getService(Ci.mivFunctions);
}

exchangeEventDialog.prototype = {
	_initialized: false,
	_oldCallback: null,

	/*
	 * onAcceptCallback: read caller content to save extra information if caller was exchangecalendar
	 */
	onAcceptCallback: function _onAcceptCallback(aItem, aCalendar, aOriginalItem, aIsClosing)
	{
		if (aCalendar.type === "exchangecalendar") {
			if (cal.isEvent(aItem)) {
				if (!aItem.className) {
					var newItem = Cc["@1st-setup.nl/exchange/calendarevent;1"]
						.createInstance(Ci.mivExchangeEvent);
					newItem.cloneToCalEvent(aItem);
					aItem = newItem;
				}
			}
			else if (!cal.isEvent(aItem)) {
				// Save extra exchange fields to item.
				if (!aItem.className) {
					var newItem = Cc["@1st-setup.nl/exchange/calendartodo;1"]
						.createInstance(Ci.mivExchangeTodo);
					newItem.cloneToCalEvent(aItem);
					aItem = newItem;
				}

				aItem.totalWork = this._document.getElementById("exchWebService-totalWork-count").value;
				aItem.actualWork = this._document.getElementById("exchWebService-actualWork-count").value;
				aItem.mileage = this._document.getElementById("exchWebService-mileage-count").value;
				aItem.billingInformation = this._document.getElementById("exchWebService-billingInformation-count").value;
				aItem.companies = this._document.getElementById("exchWebService-companies-count").value;
			}
		}

		try{
			if (this.newItem) {
				aItem.bodyType = "HTML";
				aItem.body = this._document.getElementById("exchWebService-body-editor").content;
			}
			else if (aItem.bodyType === "HTML") {
				aItem.body = this._document.getElementById("exchWebService-body-editor").content;
			}
		} catch(err) {
			dump("Error saving content\n");
		}

		if (this._oldCallback) {
			this._oldCallback(aItem, aCalendar, aOriginalItem, aIsClosing);
		}
	},

	/*
	 * Update repeat informations on Exchange tasks
	 */
	updateRepeat: function _updateRepeat()
	{
		var repeatDetails = this._document.getElementById("repeat-details").childNodes;
		if (repeatDetails.length === 3) {
			this._document.getElementById("repeat-details").removeChild(repeatDetails[2]);
			var toolTip = repeatDetails[0].getAttribute("tooltiptext");
			var tmpArray = toolTip.split("\n");
			tmpArray.splice(2,1);
			repeatDetails[0].setAttribute("tooltiptext", tmpArray.join("\n"));
			repeatDetails[1].setAttribute("tooltiptext", tmpArray.join("\n"));
		}
	},

	/*
	 * This function is used to add extra informations for Exchange tasks
	 * As the same dialog is used for non-Exchange tasks and for events, this function
	 * remove too these details when necessary.
	 */
	updateScreen: function _updateScreen(aItem, aCalendar)
	{
		var item = aItem;

		// If not an event and calendar type is exchangeCalendar, add Exchange task extra informations
		if (!cal.isEvent(item)
			&& aCalendar.type === "exchangecalendar") {

			// Set and display task owner

			this._document.getElementById("exchWebService-owner-row").setAttribute("collapsed", "false");
			var ownerLabel = this._document.getElementById("exchWebService-owner-label");
			if (ownerLabel) {
				ownerLabel.value = item.owner;
			}

			// Set and display Exchange task details

			this._document.getElementById("exchWebService-details-separator").hidden = false;
			this._document.getElementById("exchWebService-details-row1").collapsed = false;
			this._document.getElementById("exchWebService-details-row2").collapsed = false;
			this._document.getElementById("exchWebService-details-row3").collapsed = false;

			if (item.className) {
				this._document.getElementById("exchWebService-totalWork-count").value = item.totalWork;
				this._document.getElementById("exchWebService-actualWork-count").value = item.actualWork;
				this._document.getElementById("exchWebService-mileage-count").value = item.mileage;
				this._document.getElementById("exchWebService-billingInformation-count").value = item.billingInformation;
				this._document.getElementById("exchWebService-companies-count").value = item.companies;
			}

			// Set HTML content editor

			// If item contains already HTML content, just use it
			if (item.bodyType
				&& item.bodyType.toLowerCase() === "html") {
				this._document.getElementById("exchWebService-body-editor").content = item.body;
			}
			else {
				this.newItem = true;
			}

			// If the body is already filled and it contains HTML, save it to our body editor
			if (item.body
				&& item.body.toLowerCase().indexOf("<body>") > -1) {
				this._document.getElementById("exchWebService-body-editor").content = item.body;
			}
			else {
				// Otherwise, translate the DESCRIPTION property to HTML and give it to editor
				this._document.getElementById("exchWebService-body-editor").content = this.globalFunctions.fromText2HTML(item.getProperty("DESCRIPTION"));
			}

			// Display HTML content editor
			if (item.bodyType === undefined // item is not already defined
					|| item.bodyType.toLowerCase() === "html" // current item contains HTML
				) {
				// Hidde original item description editor
				this._document.getElementById("item-description").hidden = true;

				// Display our own HTML content editor
				this._document.getElementById("exchWebService-body-editor").hidden = false;
			}

			// Remove some standard inputs

			this._document.getElementById("event-grid-location-row").hidden = true;

			this._document.getElementById("reminder-none-separator").hidden = true;
			this._document.getElementById("reminder-0minutes-menuitem").hidden = true;
			this._document.getElementById("reminder-5minutes-menuitem").hidden = true;
			this._document.getElementById("reminder-15minutes-menuitem").hidden = true;
			this._document.getElementById("reminder-30minutes-menuitem").hidden = true;
			this._document.getElementById("reminder-minutes-separator").hidden = true;
			this._document.getElementById("reminder-1hour-menuitem").hidden = true;
			this._document.getElementById("reminder-2hours-menuitem").hidden = true;
			this._document.getElementById("reminder-12hours-menuitem").hidden = true;
			this._document.getElementById("reminder-hours-separator").hidden = true;
			this._document.getElementById("reminder-1day-menuitem").hidden = true;
			this._document.getElementById("reminder-2days-menuitem").hidden = true;
			this._document.getElementById("reminder-1week-menuitem").hidden = true;

			this._document.getElementById("timezone-starttime").hidden = true;
			this._document.getElementById("timezone-endtime").hidden = true;

			// Manage repeat for Exchange tasks

			if (this._document.getElementById("item-repeat")) {
				this._document.getElementById("item-repeat").addEventListener("command", function() { self.updateRepeat(); }, false);
			}

			this.updateRepeat();
		}
		// For events and other calendar type, hidde back all Exchange task details, display back standard items
		else {

			// Hide Exchange task details

			// Task owner
			this._document.getElementById("exchWebService-owner-row").setAttribute("collapsed", "true");

			// Task details
			this._document.getElementById("exchWebService-details-separator").hidden = true;
			this._document.getElementById("exchWebService-details-row1").collapsed = true;
			this._document.getElementById("exchWebService-details-row2").collapsed = true;
			this._document.getElementById("exchWebService-details-row3").collapsed = true;

			// HTML Task content editor
			this._document.getElementById("item-description").hidden = false;
			this._document.getElementById("exchWebService-body-editor").hidden = true;

			// Reset standard form
			this._document.getElementById("event-grid-location-row").hidden = false;
			this._document.getElementById("event-grid-recurrence-row").hidden=false;

			// Reset reminder select list for todo
			this._document.getElementById("reminder-none-separator").hidden = false;
			this._document.getElementById("reminder-0minutes-menuitem").hidden = false;
			this._document.getElementById("reminder-5minutes-menuitem").hidden = false;
			this._document.getElementById("reminder-15minutes-menuitem").hidden = false;
			this._document.getElementById("reminder-30minutes-menuitem").hidden = false;
			this._document.getElementById("reminder-minutes-separator").hidden = false;
			this._document.getElementById("reminder-1hour-menuitem").hidden = false;
			this._document.getElementById("reminder-2hours-menuitem").hidden = false;
			this._document.getElementById("reminder-12hours-menuitem").hidden = false;
			this._document.getElementById("reminder-hours-separator").hidden = false;
			this._document.getElementById("reminder-1day-menuitem").hidden = false;
			this._document.getElementById("reminder-2days-menuitem").hidden = false;
			this._document.getElementById("reminder-1week-menuitem").hidden = false;

			// Reset timezone start/end time
			this._document.getElementById("timezone-starttime").hidden = false;
			this._document.getElementById("timezone-endtime").hidden = false;
		}
	},

	/*
	 * onLoad: setup event dialog window
	 * - Add callback
	 **/
	onLoad: function _onLoad()
	{
		if (this._document.getElementById("exchWebService-body-editor")) {
			this._document.getElementById("exchWebService-body-editor").setAttribute("scrollbars","yes");
		}

 		if (this._window.arguments[0].calendarEvent.calendar.type != "exchangecalendar") {
			if (this._document.getElementById("item-description")) {
				this._document.getElementById("item-description").hidden = false;
			}

			if (this._document.getElementById("exchWebService-body-editor")) {
				this._document.getElementById("exchWebService-body-editor").hidden = true;
			}

			return;
		}

		if (this._initialized) {
			return;
		}

		// Set window.calendarItem to be able to call getCalendar()
		var args = this._window.arguments[0];
		var item = args.calendarEvent;
		this._window.calendarItem = item.clone();

		// Override dialog callback to add extra exchangecalendar information processing
		this._oldCallback = this._window.onAcceptCallback;
		var self = this;
		this._window.onAcceptCallback = function(aItem, aCalendar, aOriginalItem, aIsClosing) {
			self.onAcceptCallback(aItem, aCalendar, aOriginalItem, aIsClosing);
		};

		// Update screen according to task / event
		this.updateScreen(item, item.calendar);

		this._initialized = true;
	},

	/*
	 * selectedCalendarChanged: modify event-dialog to add extra exchangecalendar info when an exchange calendar is selected
	 */
	selectedCalendarChanged: function _selectedCalendarChanged(aMenuList)
	{
		updateCalendar();

		this.updateScreen(this._window.calendarItem, getCurrentCalendar());
	},

	/*
	 * editAttendees: call editAttendees with some already known informations
	 */
	editAttendees: function _editAttendees() {
		var eventDialog = this._window;
		var calendar = eventDialog.getCurrentCalendar();

		var callback = function (attendees, organizer, startTime, endTime) {
			eventDialog.attendees = attendees;

			if (organizer) {
				// In case we didn't have an organizer object before we
				// added attendees to our event we take the one created
				// by the 'invite attendee'-dialog.
				if (eventDialog.organizer) {
					// The other case is that we already had an organizer object
					// before we went throught the 'invite attendee'-dialog. In that
					// case make sure we don't carry over attributes that have been
					// set to their default values by the dialog but don't actually
					// exist in the original organizer object.
					if (!eventDialog.organizer.id) {
						organizer.id = null;
					}
					if (!eventDialog.organizer.role) {
						organizer.role = null;
					}
					if (!eventDialog.organizer.participationStatus) {
						organizer.participationStatus = null;
					}
					if (!eventDialog.organizer.commonName) {
						organizer.commonName = null;
					}
				}
				eventDialog.organizer = organizer;
  		}

			var duration = endTime.subtractDate(startTime);
			var startTime = startTime.clone();
			var endTime = endTime.clone();

			var kDefaultTimezone = calendarDefaultTimezone();
			var gStartTimezone = startTime.timezone;
			var gEndTimezone = endTime.timezone;
			var gStartTime = startTime.getInTimezone(kDefaultTimezone);
			var gEndTime = endTime.getInTimezone(kDefaultTimezone);
			var gItemDuration = duration;

			updateDateTime();
			updateAllDay();
			if (isAllDay != gStartTime.isDate) {
				setShowTimeAs(gStartTime.isDate)
			}
		};

		var startTime = {};
		var endTime = {};

		if (eventDialog.gStartTime) {
			startTime = eventDialog.gStartTime.getInTimezone(eventDialog.gStartTimezone);
		}
		if (eventDialog.gEndTime) {
			endTime = eventDialog.gEndTime.getInTimezone(eventDialog.gEndTimezone);
		}

		var isAllDay = null;
		var isAllDayBox = this._document.getElementById("event-all-day");
		if (isAllDayBox) {
			isAllDay = isAllDayBox.getAttribute('checked');
		}
		if (isAllDay) {
			startTime.isDate = true;
			endTime.isDate = true;
			endTime.day += 1;
		} else {
			startTime.isDate = false;
			endTime.isDate = false;
		}

		var menuItem = this._document.getElementById('options-timezone-menuitem');
		var displayTimezone = true;
		if( menuItem ){
			displayTimezone = menuItem.getAttribute('checked');
		}

		var ewsDialogAttendees = {};
		ewsDialogAttendees.endTime = endTime;
		ewsDialogAttendees.startTime = startTime;
		ewsDialogAttendees.displayTimezone = displayTimezone;
		ewsDialogAttendees.attendees = eventDialog.attendees;
		ewsDialogAttendees.organizer = eventDialog.organizer && eventDialog.organizer.clone();
		ewsDialogAttendees.calendar = calendar;
		ewsDialogAttendees.item = eventDialog.calendarItem;
		ewsDialogAttendees.onOk = callback;
		ewsDialogAttendees.fbWrapper = eventDialog.fbWrapper;

		// open the dialog modally
		openDialog(
				"chrome://calendar/content/calendar-event-dialog-attendees.xul",
				"_blank",
				"chrome,titlebar,modal,resizable",
				ewsDialogAttendees);
	}
}


var exchToolsEventDialog = new exchangeEventDialog(document, window);
window.addEventListener("load", function () { window.removeEventListener("load",arguments.callee,false); exchToolsEventDialog.onLoad(); }, true);

