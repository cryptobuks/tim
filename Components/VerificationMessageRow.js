'use strict';

var utils = require('../utils/utils');
var translate = utils.translate
var MessageView = require('./MessageView');
var NewResource = require('./NewResource');
import CustomIcon from '../styles/customicons'
var Icon = require('react-native-vector-icons/Ionicons');
var constants = require('@tradle/constants');
var RowMixin = require('./RowMixin');
var equal = require('deep-equal')
var BG_IMAGE = require('../img/verificationBg.jpg')

import { makeResponsive } from 'react-native-orient'
var Actions = require('../Actions/Actions')
var StyleSheet = require('../StyleSheet')
var chatStyles = require('../styles/chatStyles')
var reactMixin = require('react-mixin');

import {
  Image,
  // StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  Navigator,
  View,
  processColor
} from 'react-native'

import React, { Component } from 'react'

class VerificationMessageRow extends Component {
  constructor(props) {
    super(props);
    var resource = this.props.resource;
    var model = utils.getModel(resource[constants.TYPE] || resource.id).value;
    var me = utils.getMe();
  }
  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.orientation !== nextProps.orientation  &&  this.props.orientation !== 'UNKNOWN'  &&  nextProps.orientation !== 'UNKNOWN')
      return true
    return !equal(this.props.resource, nextProps.resource) ||
           !equal(this.props.to, nextProps.to)             ||
           this.props.sendStatus !== nextProps.sendStatus
  }
  render() {
    var resource = this.props.resource;
    var model = utils.getModel(resource[constants.TYPE]).value;
    var renderedRow = [];

    var time = this.getTime(resource);
    var date = time
             ? <Text style={chatStyles.date}>{time}</Text>
             : <View />;

    var isMyMessage = this.isMyMessage();

    var dType = utils.getType(resource.document)
    var msgModel = utils.getModel(dType).value
    var orgName = resource._verifiedBy
                ? resource._verifiedBy.title
                : resource.organization  ? resource.organization.title : ''

    let isThirdPartyVerification
    let isReadOnlyChat
    if (this.props.context) {
      let me = utils.getMe()
      if (me.isEmployee) {
        isReadOnlyChat = utils.isReadOnlyChat(this.props.to)
        if  (isReadOnlyChat)
          isThirdPartyVerification = utils.getId(resource.organization) !== utils.getId(this.props.context.to.organization)
        else if (this.props.to[constants.TYPE] === constants.TYPES.PROFILE)
          isThirdPartyVerification = utils.getId(me) !== utils.getId(this.props.context.to) || (resource._verifiedBy  &&  utils.getId(me.organization) !== utils.getId(resource._verifiedBy))
      }
      else
        isThirdPartyVerification = resource._verifiedBy != null && utils.getId(resource._verifiedBy)  !== utils.getId(resource.organization)// &&  utils.getId(this.props.context.to.organization) !== utils.getId(resource._verifiedBy)
    }
    let isShared = this.isShared()
    isMyMessage = isShared
    let bankStyle = this.props.bankStyle
    let bgColor
    if (isThirdPartyVerification)
      bgColor = '#93BEBA'
    else if (isShared)
      bgColor = bankStyle.SHARED_WITH_VERIFICATION_BG
    else
      bgColor = bankStyle.VERIFIED_LINK_COLOR
    let verifiedBy = isShared ? translate('youShared', orgName) : translate('verifiedBy', orgName)

    var w = utils.dimensions(VerificationMessageRow).width
    let msgWidth = Math.min(Math.floor(w * 0.7), 600)
    if (isReadOnlyChat)
      msgWidth -= 50 // provider icon and padding
    let numberOfCharacters = msgWidth / 12
    if (verifiedBy.length > numberOfCharacters)
      verifiedBy = verifiedBy.substring(0, numberOfCharacters) + '..'

    let headerStyle = [
      chatStyles.verifiedHeader,
      styles.header,
      isMyMessage ? styles.headerRight : styles.headerLeft
    ]
    let bulletStyle = {color: bgColor, marginHorizontal: 7, alignSelf: 'center'}

    renderedRow = <View>
                    <View style={headerStyle}>
                      <Icon style={[chatStyles.verificationIcon, {color: bgColor}]} size={20} name={'md-checkmark'} />
                      <Text style={[chatStyles.verificationHeaderText, styles.verificationHeaderText]}>{verifiedBy}</Text>
                    </View>
                    <View style={styles.separator}>
                      <View style={[styles.separatorPart, {width: msgWidth * 0.2}]} />
                      <Text style={bulletStyle}>🔸</Text>
                      <View style={[styles.separatorPart, {width: msgWidth * 0.2}]} />
                    </View>
                    <View>
                      {
                        this.formatDocument({
                          model: msgModel,
                          verification: resource,
                          onPress: this.verify.bind(this),
                          isAccordion: isThirdPartyVerification,
                          isMyMessage: isMyMessage
                        })
                      }
                    </View>
                  </View>

    var viewStyle = {
      width: msgWidth,
      flexDirection: 'row',
      alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
      backgroundColor: 'transparent',
      marginBottom: 3,
    }

    let addStyle = [
      { borderWidth: 0, backgroundColor: 'transparent'}, /*, backgroundColor: isShared ? '#ffffff' : bankStyle.VERIFICATION_BG,*/
      isMyMessage ? styles.headerRight : styles.headerLeft
    ];

    let shareWith
    if (this.props.shareWithRequestedParty) {
      let title = this.props.shareWithRequestedParty.organization && this.props.shareWithRequestedParty.organization.title
      shareWith = <View style={styles.shareWithInquirer}>
                    <TouchableOpacity onPress={this.shareWithRequestedParty.bind(this)}>
                       <View style={[chatStyles.shareButton, {marginLeft: 15, justifyContent: 'flex-start'}]}>
                        <CustomIcon name='tradle' style={{color: '#4982B1' }} size={32} />
                        <Text style={chatStyles.shareText}>{translate('Share')}</Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.center}>
                      <Text style={styles.shareWithText}>{'with ' + title}</Text>
                    </View>
                  </View>
    }
    else
      shareWith = <View/>

    let messageBody =
          <TouchableOpacity onPress={this.verify.bind(this, resource)}>
            <View style={styles.messageBody}>
              <View style={[chatStyles.row, viewStyle]}>
                {this.getOwnerPhoto(isMyMessage)}
                <View style={[chatStyles.textContainer, addStyle]}>
                  <View style={[{flex: 1, backgroundColor: 'transparent', borderRadius: 10, borderWidth: 1, borderColor: '#D4D4B8'}, isMyMessage ? {borderTopRightRadius: 0} : {borderTopLeftRadius: 0}]}>
                    <Image source={BG_IMAGE} style={[styles.image, addStyle]} >
                      {renderedRow}
                    </Image>
                    {shareWith}
                 </View>
              </View>
            </View>
            {this.getSendStatus()}
            </View>
          </TouchableOpacity>

    var viewStyle = { margin: 1, paddingRight: 10 }
    return (
      <View style={viewStyle} key={this.getNextKey()}>
        {date}
        {messageBody}
      </View>
    );
  }
  shareWithRequestedParty() {
    this.props.navigator.pop()
    Actions.share(this.props.resource, this.props.shareWithRequestedParty.organization, this.props.originatingMessage) // forRequest - originating message
  }
  verify(event) {
    var resource = this.props.resource;
    var isVerification = resource[constants.TYPE] === constants.TYPES.VERIFICATION;
    var r = isVerification &&  !resource.sources  &&  !resource.method  ? resource.document : resource

    var passProps = {
      resource: r,
      bankStyle: this.props.bankStyle,
      currency: this.props.currency
    }
    if (!isVerification)
      passProps.verify = true
    else
      passProps.verification = resource

    var model = utils.getModel(r[constants.TYPE]).value;
    let title
    if (r[constants.TYPE] === constants.TYPES.VERIFICATION) {
      let type = utils.getType(r.document)
      if (type)
        title = translate(utils.getModel(type).value)
    }
    if (!title)
      title = translate(model)
    var route = {
      id: 5,
      component: MessageView,
      backButtonTitle: 'Back',
      passProps: passProps,
      title: title
    }
    if (this.isMyMessage()) {
      route.rightButtonTitle = translate('edit');
      route.onRightButtonPress = {
        title: translate('edit'),
        component: NewResource,
        // titleTextColor: '#7AAAC3',
        id: 4,
        passProps: {
          resource: r,
          metadata: model,
          bankStyle: this.props.bankStyle,
          currency: this.props.currency,
          callback: this.props.onSelect.bind(this, r)
        }
      };
    }
    this.props.navigator.push(route);
  }
}
var styles = StyleSheet.create({
  shareWithInquirer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderColor: '#dddddd',
    // marginHorizontal: -7,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopColor: '#dddddd',
    borderWidth: 0.5
  },
  separator: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: -5
  },
  separatorPart: {
    height: 1,
    backgroundColor: '#cccccc',
    alignSelf: 'center'
  },
  verificationHeaderText: {
    color: '#555555',
    fontStyle: 'italic'
  },
  header: {
    marginTop: 10,
    backgroundColor: 'transparent'
  },
  headerRight: {
    borderTopRightRadius: 0,
    borderTopLeftRadius: 10
  },
  headerLeft: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 10
  },
  messageBody: {
    flexDirection: 'column',
    flex: 1,
    margin: 2,
    paddingVertical: 3
  },
  image: {
    borderRadius: 10,
    height: 120,
    resizeMode: 'cover',
    overflow: 'hidden'
  },
  imageFrame: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4D4B8'
  },
  center: {
    justifyContent: 'center'
  },
  shareWithText: {
    fontSize: 16,
    color: '#757575'
  }

})
reactMixin(VerificationMessageRow.prototype, RowMixin);
VerificationMessageRow = makeResponsive(VerificationMessageRow)

module.exports = VerificationMessageRow;

/*
    let shareWith = this.props.shareWithRequestedParty
                  ? <View style={[chatStyles.shareView, {justifyContent: 'flex-start', paddingLeft: 5}]}>
                      <View style={{flexDirection: 'column'}}>
                      <TouchableOpacity onPress={this.shareWithRequestedParty.bind(this)}>
                         <View style={[chatStyles.shareButton, {flexDirection: 'column', marginHorizontal: 3}]}>
                          <CustomIcon name='tradle' style={{color: '#ffffff'}} size={32} />
                        </View>
                      </TouchableOpacity>
                      <Text style={[chatStyles.shareText, {color: '#4982B1', fontSize: 12}]}>{translate('Share')}</Text>
                      </View>
                      <View style={{justifyContent: 'center', paddingLeft: 5}}>
                        <Text style={{fontSize: 14, color: '#4982B1'}}>{'with ' + this.props.shareWithRequestedParty.title}</Text>
                      </View>
                    </View>
                  : <View/>
    let isAndroid = utils.isAndroid()
    let bg = isAndroid
           ? <View/>
           : <Image source={BG_IMAGE} style={[{position: 'absolute', top: 0, borderRadius: 10, left: 0, width: (isReadOnlyChat ? msgWidth - 40 : msgWidth), height: 110, opacity: 0.4}, addStyle]}/>

    let androidStyle = {backgroundColor: bankStyle.VERIFICATION_BG, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: bankStyle.SHARE_BUTTON_BACKGROUND_COLOR}
    let messageBody =
          <TouchableOpacity onPress={this.verify.bind(this, resource)}>
            <View style={{flexDirection: 'column', flex: 1}}>
              <View style={[chatStyles.row, viewStyle]}>
                {this.getOwnerPhoto(isMyMessage)}
                <View style={[chatStyles.textContainer, addStyle]}>
                  <View style={[{flex: 1} , isAndroid ? androidStyle : {backgroundColor: 'transparent'}]}>
                    {bg}
                    {renderedRow}
                    {shareWith}
                 </View>
              </View>
            </View>
            {this.getSendStatus()}
            </View>
          </TouchableOpacity>

    var viewStyle = { margin: 1 }
*/
  // render() {
  //   var resource = this.props.resource;
  //   var model = utils.getModel(resource[constants.TYPE]).value;
  //   var renderedRow = [];

  //   var time = this.getTime(resource);
  //   var date = time
  //            ? <Text style={chatStyles.date}>{time}</Text>
  //            : <View />;

  //   var isMyMessage = this.isMyMessage();
  //   var w = utils.dimensions(VerificationMessageRow).width

  //   var dType = utils.getType(resource.document)
  //   var msgModel = utils.getModel(dType).value
  //   var orgName = resource._verifiedBy
  //               ? resource._verifiedBy.title
  //               : resource.organization  ? resource.organization.title : ''

  //   let me = utils.getMe()
  //   let isThirdPartyVerification
  //   let isReadOnlyChat
  //   if (this.props.context) {
  //     let me = utils.getMe()
  //     if (me.isEmployee) {
  //       isReadOnlyChat = utils.isReadOnlyChat(this.props.to)
  //       if  (isReadOnlyChat)
  //         isThirdPartyVerification = utils.getId(resource.organization) !== utils.getId(this.props.context.to.organization)
  //       else if (this.props.to[constants.TYPE] === constants.TYPES.PROFILE)
  //         isThirdPartyVerification = utils.getId(me) !== utils.getId(this.props.context.to) || (resource._verifiedBy  &&  utils.getId(me.organization) !== utils.getId(resource._verifiedBy))
  //     }
  //     else
  //       isThirdPartyVerification = resource._verifiedBy != null && utils.getId(resource._verifiedBy)  !== utils.getId(resource.organization)// &&  utils.getId(this.props.context.to.organization) !== utils.getId(resource._verifiedBy)
  //   }
  //   let isShared = this.isShared()
  //   isMyMessage = isShared
  //   let bgColor
  //   if (isThirdPartyVerification)
  //     bgColor = '#93BEBA'
  //   else if (isShared)
  //     bgColor = bankStyle.SHARED_WITH_VERIFICATION_BG
  //   else
  //     bgColor = bankStyle.VERIFIED_HEADER_COLOR
  //   let verifiedBy = isShared ? translate('youShared', orgName) : translate('verifiedBy', orgName)
  //   let msgWidth = w * 0.8
  //   let numberOfCharacters = msgWidth / 12
  //   if (verifiedBy.length > numberOfCharacters)
  //     verifiedBy = verifiedBy.substring(0, numberOfCharacters) + '..'

  //   let headerStyle = [
  //     chatStyles.verifiedHeader,
  //     {marginTop: 10},
  //     // {backgroundColor: bgColor}, // opacity: isShared ? 0.5 : 1},
  //     {backgroundColor: 'transparent'}, //, borderBottomWidth: 1, borderBottomColor: bgColor}, // opacity: isShared ? 0.5 : 1},
  //     isMyMessage ? {borderTopRightRadius: 0, borderTopLeftRadius: 10} : {borderTopLeftRadius: 0, borderTopRightRadius: 10}
  //   ]

  //   renderedRow = <View>
  //                   <View style={headerStyle}>
  //                     <Icon style={[chatStyles.verificationIcon, {color: bgColor}]} size={20} name={'md-checkmark'} />
  //                     <Text style={[chatStyles.verificationHeaderText, {color: '#555555', fontStyle: 'italic'}]}>{verifiedBy}</Text>
  //                   </View>
  //                   <View style={{flexDirection: 'row', alignSelf: 'center', marginTop: -5}}>
  //                     <View style={{height: 1, backgroundColor: '#cccccc', width: msgWidth * 0.2, alignSelf: 'center'}} />
  //                     <Text style={{color: bgColor, marginHorizontal: 7, alignSelf: 'center'}}>🔸</Text>
  //                     <View style={{height: 1, backgroundColor: '#cccccc', width: msgWidth * 0.2, alignSelf: 'center'}} />
  //                   </View>
  //                   <View>
  //                     {
  //                       this.formatDocument({
  //                         model: msgModel,
  //                         verification: resource,
  //                         onPress: this.verify.bind(this),
  //                         isAccordion: isThirdPartyVerification
  //                       })
  //                     }
  //                   </View>
  //                 </View>

  //   var viewStyle = {
  //     width: msgWidth,
  //     flexDirection: 'row',
  //     // borderWidth: 1,
  //     alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
  //     backgroundColor: 'transparent',
  //     marginBottom: 3,
  //     // backgroundColor: bankStyle.BACKGROUND_COLOR
  //   }

  //   let addStyle = [
  //     // chatStyles.verificationBody,
  //     {borderWidth: 0, backgroundColor: 'transparent' /*, backgroundColor: isShared ? '#ffffff' : bankStyle.VERIFICATION_BG,*/ },
  //     isMyMessage ? {borderTopRightRadius: 0} : {borderTopLeftRadius: 0}
  //   ];
  //   // if (isAndroid) {
  //   //   addStyle.push({
  //   //     backgroundColor: bankStyle.VERIFICATION_BG,
  //   //     borderColor: bankStyle.VERIFIED_BORDER_COLOR,
  //   //     borderWidth: 1,
  //   //     borderRadius: 10
  //   //   })
  //   //   addStyle.push(isMyMessage ? {borderTopRightRadius: 0} : {borderTopLeftRadius: 0})
  //   // }

  //   let shareWith
  //   if (this.props.shareWithRequestedParty) {
  //     let title = this.props.shareWithRequestedParty.organization && this.props.shareWithRequestedParty.organization.title
  //     shareWith = <View style={styles.shareWithInquirer}>
  //                   <TouchableOpacity onPress={this.shareWithRequestedParty.bind(this)}>
  //                      <View style={[chatStyles.shareButton, {marginLeft: 15, justifyContent: 'flex-start', backgroundColor: bankStyle.SHARE_BUTTON_BACKGROUND_COLOR}]}>
  //                       <CustomIcon name='tradle' style={{color: '#ffffff' }} size={32} />
  //                       <Text style={chatStyles.shareText}>{translate('Share')}</Text>
  //                     </View>
  //                   </TouchableOpacity>
  //                   <View style={{justifyContent: 'center'}}>
  //                     <Text style={{fontSize: 16, color: '#757575'}}>{'with ' + title}</Text>
  //                   </View>
  //                 </View>
  //   }
  //   else {
  //     shareWith = <View/>
  //     viewStyle.height = 110
  //   }
  //   // let bgImage = <Image source={BG_IMAGE} style={[{position: 'absolute', top: 0, borderRadius: 10, left: 0, width: (isReadOnlyChat ? msgWidth - 40 : msgWidth), height: 110, resizeMode: 'stretch', opacity: 0.4}, addStyle]}/>

  //   let messageBody =
  //         <TouchableOpacity onPress={this.verify.bind(this, resource)}>
  //           <View style={{flexDirection: 'column', flex: 1}}>
  //             <View style={[chatStyles.row, viewStyle]}>
  //               {this.getOwnerPhoto(isMyMessage)}
  //               <View style={[chatStyles.textContainer, addStyle]}>
  //                 <View style={{flex: 1, backgroundColor: 'transparent'}}>
  //                   <Image source={BG_IMAGE} style={[{position: 'absolute', top: 0, borderRadius: 10, left: 0, width: (isReadOnlyChat ? msgWidth - 40 : msgWidth), height: 110, resizeMode: 'stretch', opacity: 0.4}, addStyle]}/>
  //                   {renderedRow}
  //                   {shareWith}
  //                </View>
  //             </View>
  //           </View>
  //           {this.getSendStatus()}
  //           </View>
  //         </TouchableOpacity>

  //   var viewStyle = { margin: 1 }

  //   return (
  //     <View style={viewStyle} key={this.getNextKey()}>
  //       {date}
  //       {messageBody}
  //     </View>
  //   );
  // }
