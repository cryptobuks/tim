'use strict';

var utils = require('../utils/utils');
var translate = utils.translate
var NewResource = require('./NewResource');
import Icon from 'react-native-vector-icons/Ionicons';
var constants = require('@tradle/constants');
var RowMixin = require('./RowMixin');
var ResourceMixin = require('./ResourceMixin')
var extend = require('extend')
var equal = require('deep-equal')
import { makeResponsive } from 'react-native-orient'
var StyleSheet = require('../StyleSheet')
var reactMixin = require('react-mixin');
var chatStyles = require('../styles/chatStyles')
import ImageInput from './ImageInput'

const ENUM = 'tradle.Enum'
const PHOTO = 'tradle.Photo'
const IPROOV_SELFIE = 'tradle.IProovSelfie'
const PRODUCT_APPLICATION = 'tradle.ProductApplication'

const DEFAULT_LINK_COLOR = '#2892C6'
const TYPE = constants.TYPE

import {
  Image,
  // StyleSheet,
  Text,
  TouchableHighlight,
  Alert,
  Navigator,
  View,
  Platform,
  processColor
} from 'react-native'

import React, { Component } from 'react'
import ENV from '../utils/env'

class FormErrorRow extends Component {
  constructor(props) {
    super(props);
  }
  shouldComponentUpdate(nextProps, nextState) {
    let {resource, to, orientation} = this.props
    if (this.props.sendStatus !== nextProps.sendStatus)
      return true
    if (resource._documentCreated !== nextProps.resource._documentCreated ||
        resource._sendStatus !== nextProps.resource._sendStatus)
      return true
    let rid = utils.getId(resource)
    // if (nextProps.addedItem  &&  utils.getId(nextProps.addedItem) === rid) {
    //   // HACK for when the form status that is fulfilling this request changes the rendering uses
    //   // the old list for that
    //   if (nextProps.addedItem._documentCreated  &&  !nextProps.resource._documentCreated)
    //     return false
    //   return true
    // }
    if (rid !== utils.getId(nextProps.resource) ||  //!equal(resource, nextProps.resource)    ||
        !equal(to, nextProps.to)                ||
        utils.resized(this.props, nextProps))
      return true
    return false
  }

  render() {
    var resource = this.props.resource;
    var model = utils.getModel(resource[TYPE] || resource.id).value;

    var isMyMessage = this.isMyMessage()//  &&  !isRemediationCompleted
    var to = this.props.to;
    var ownerPhoto = this.getOwnerPhoto(isMyMessage)
    let hasOwnerPhoto = !isMyMessage &&  to  &&  to.photos;

    var renderedRow = [];
    var ret = this.formatRow(isMyMessage, renderedRow);
    let onPressCall = ret ? ret.onPressCall : null

    var addStyle

    let message = resource.message

    const bankStyle = this.props.bankStyle

    if (!renderedRow.length) {
      var vCols = utils.getDisplayName(resource, model.properties);
      if (vCols)
        renderedRow = <Text style={chatStyles.resourceTitle} numberOfLines={2}>{vCols}</Text>;
    }
    else {
      var fromHash = resource.from.id;
      if (isMyMessage)
        addStyle = [chatStyles.myCell, {backgroundColor: bankStyle.myMessageBackgroundColor}]
      else
        addStyle = [chatStyles.verificationBody, {flex: 1, borderTopLeftRadius: 0}]

      addStyle = [addStyle, chatStyles.verificationBody, {backgroundColor: bankStyle.formErrorBg, borderColor: resource._documentCreated ? bankStyle.fixErrorColor : bankStyle.formErrorBorder}]; //model.style];
    }
    var properties = model.properties;

    var rowStyle = [chatStyles.row, {backgroundColor: 'transparent'}];
    var val = this.getTime(resource);
    var date = val
             ? <Text style={chatStyles.date} numberOfLines={1}>{val}</Text>
             : <View />;

    let prop =  this.isOnePropForm()
    // HACK
    var w = utils.dimensions(FormErrorRow).width
    let msgWidth = w * 0.8
    let numberOfCharsInWidth = msgWidth / utils.getFontSize(10)

    var viewStyle = {flexDirection: 'row', alignSelf: isMyMessage ? 'flex-end' : 'flex-start'};
    if (message) {
      if (message.charAt(0) === '[')
        viewStyle.width = msgWidth; //isMyMessage || !hasOwnerPhoto ? w - 70 : w - 50;
    }
    let width =  message ? Math.min(msgWidth, message.length * utils.getFontSize(18) + 40) : msgWidth
    viewStyle.width = width
    let sendStatus = this.getSendStatus()
    var sealedStatus = (resource.txId)
                     ? <View style={chatStyles.sealedStatus}>
                         <Icon name={'ios-ribbon'} size={30} color='#316A99' style={{opacity: 0.5}} />
                       </View>
                     : <View />

    let cellStyle
    if (addStyle)
      cellStyle = addStyle
    else
      cellStyle = chatStyles.textContainer
    var messageBody
    if (prop) {
      if (prop.ref == PHOTO) {
        messageBody = <View style={[rowStyle, viewStyle]}>
                       <ImageInput prop={prop} style={{flex: 1}} onImage={item => this.onSetMediaProperty(prop.name, item)}>
                        <View style={cellStyle}>
                        {renderedRow}
                        </View>
                       </ImageInput>
                     </View>
      }
      else if (resource.prefill[TYPE] === IPROOV_SELFIE) {
        messageBody = <View key={this.getNextKey()}>
                        <TouchableHighlight onPress={() => this.showIproovScanner(prop, prop.name)} underlayColor='transparent'>
                        <View style={cellStyle}>
                           {renderedRow}
                        </View>
                        </TouchableHighlight>
                     </View>
      }
    }
    if (!messageBody) {
      let shared
      if (this.isShared())
        shared = <View style={[chatStyles.verifiedHeader, {backgroundColor: bankStyle.sharedWithBg}]}>
                   <Text style={styles.white18}>{translate('youShared', resource.to.organization.title)}</Text>
                 </View>

      messageBody = <TouchableHighlight onPress={onPressCall ? onPressCall : () => {}} underlayColor='transparent'>
                      <View style={[rowStyle, viewStyle]}>
                        <View style={{marginTop: 2}}>
                          {ownerPhoto}
                        </View>
                        <View style={cellStyle}>
                          <View style={styles.container}>
                          {shared}
                          {renderedRow}
                         </View>
                         {sealedStatus}
                        </View>
                      </View>
                    </TouchableHighlight>
    }
    var model = utils.getModel(this.props.resource[TYPE]).value;
    var bg = bankStyle.backgroundImage ? 'transparent' : bankStyle.backgroundColor
    return (
      <View style={[styles.viewStyle, {backgroundColor: bg, width: width}]}>
        {date}
        {messageBody}
        {sendStatus}
      </View>
    )
  }

  showEditResource() {
    let errs = {}
    let requestedProperties = {}
    let {resource} = this.props
    let r = resource.prefill
    if (resource.errors  &&  resource.errors.length) {
      if (Array.isArray(resource.errors)) {
        for (let p of resource.errors)
          errs[p.name] = p.error
      }
      else
        errs = this.props.resource.errors
    }
    else if (resource.requestedProperties) {
      for (let p of resource.requestedProperties)
        requestedProperties[p.name] = p.message || ''
    }

    let me = utils.getMe()
    r.from = {
      id: utils.getId(me),
      title: utils.getDisplayName(me)
    }
    r.to = this.props.resource.from

    // Prefill for testing and demoing
    // var isPrefilled = model.id in formDefaults
    // if (isPrefilled)
    //   extend(true, resource, formDefaults[model.id])
    let type = utils.getType(r)
    let model = utils.getModel(type).value
    this.props.navigator.push({
      id: 4,
      title: translate(model),
      rightButtonTitle: 'Done',
      backButtonTitle: 'Back',
      component: NewResource,
      // titleTextColor: '#7AAAC3',
      passProps:  {
        model: model,
        resource: r,
        isPrefilled: true,
        errs: errs,
        requestedProperties: requestedProperties,
        currency: this.props.currency,
        bankStyle: this.props.bankStyle,
        originatingMessage: this.props.resource
      }
    });

  }
  formatRow(isMyMessage, renderedRow) {
    var resource = this.props.resource;
    var model = utils.getModel(resource[TYPE] || resource.id).value;

    let context = to[TYPE]  &&  to[TYPE] === PRODUCT_APPLICATION ? to : resource._context
    let isReadOnlyChat = context  &&  utils.isReadOnlyChat(resource, context) //this.props.context  &&  this.props.context._readOnly

    var viewCols = model.gridCols || model.viewCols;
    if (!viewCols)
      return
    var self = this;

    var properties = model.properties;

    var cnt = 0;
    var self = this

    var vCols = [];

    viewCols.forEach((v) => {
      if (properties[v].type === 'array'  ||  properties[v].type === 'date')
        return;

      if (properties[v].ref) {
        if (resource[v])
          vCols.push(this.getPropRow(properties[v], resource, resource[v].title || resource[v]))
        return;
      }
      var style = chatStyles.resourceTitle
      if (isMyMessage)
        style = [style, styles.myMessage];

      let rtype = resource.prefill[TYPE] || utils.getId(resource.prefill).split('_')[0]
      let iconName = resource._documentCreated ? 'ios-done-all' : 'ios-arrow-forward'
      let iconSize = resource._documentCreated ? 30 : 20

      vCols.push(
        <View key={self.getNextKey()} style={{paddingBottom: 3}}>
          <Text style={[style, {color: '#555555'}]}>{resource.message} </Text>
          <View style={chatStyles.rowContainer}>
            <Text style={[style, {color: resource._documentCreated || isReadOnlyChat ?  '#aaaaaa' : self.props.bankStyle.formErrorColor}]}>{translate(utils.getModel(rtype).value)}</Text>
            <Icon name={iconName} size={iconSize} color={resource._documentCreated || isReadOnlyChat ? self.props.bankStyle.fixErrorColor : self.props.bankStyle.formErrorColor} style={Platform.OS === 'web' ? {marginTop: -3} : {}}/>
          </View>
        </View>
      )
    });
    if (vCols  &&  vCols.length) {
      vCols.forEach(function(v) {
        renderedRow.push(v);
      })
    }
    if (isReadOnlyChat)
      return null
    if (resource._documentCreated)
      return null
    if (utils.getId(resource.from) === utils.getId(utils.getMe()))
      return null
    else
      return {onPressCall: this.showEditResource.bind(this)}
  }
}

var styles = StyleSheet.create({
  container: {
    flex: 1
  },
  white18: {
    color: '#ffffff',
    fontSize: 18
  },
  viewStyle: {
    margin: 1,
    backgroundColor: '#f7f7f7'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  myMessage: {
    justifyContent: 'flex-end',
    color: '#ffffff'
  }
});
reactMixin(FormErrorRow.prototype, RowMixin);
reactMixin(FormErrorRow.prototype, ResourceMixin)
FormErrorRow = makeResponsive(FormErrorRow)

module.exports = FormErrorRow;
