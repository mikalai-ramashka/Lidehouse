import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';

// This code helps to stop event bubbling on dataTable buttons, so it doesn't select the row after button click
// Classic event.stopPropagation() on button doesn't work, cause the table immediately gets the click event
// ref: https://datatables.net/reference/event/user-select
Template.ReactiveDatatable.onRendered(function () {
  this.$('.dataTable').DataTable().on('user-select', function( e, dt, type, cell, originalEvent) {
    if ($(originalEvent.target).closest('.btn').length) e.preventDefault();
  });
});
