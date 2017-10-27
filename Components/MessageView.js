'use strict';

var utils = require('../utils/utils');
var translate = utils.translate
var constants = require('@tradle/constants');
var ArticleView = require('./ArticleView');
var PhotoList = require('./PhotoList');
var PhotoView = require('./PhotoView');
import Icon from 'react-native-vector-icons/Ionicons';

var ShowRefList = require('./ShowRefList');
var VerificationView = require('./VerificationView')
var NewResource = require('./NewResource');
var PageView = require('./PageView')
var Actions = require('../Actions/Actions');
var Reflux = require('reflux');
var Store = require('../Store/Store');
var reactMixin = require('react-mixin');
var extend = require('extend');
var ResourceMixin = require('./ResourceMixin');
var HELP_COLOR = 'blue'
var NetworkInfoProvider = require('./NetworkInfoProvider')
var defaultBankStyle = require('../styles/defaultBankStyle.json')

const PHOTO = 'tradle.Photo'
const { TYPE } = constants
const ITEM = 'tradle.Item'
// import Prompt from 'react-native-prompt'
const { VERIFICATION, ENUM, MONEY } = constants.TYPES
const NAV_BAR_CONST = Platform.OS === 'ios' ? 64 : 56

import ActionSheet from './ActionSheet'

import {
  // StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  PropTypes,
  Alert,
  Platform
} from 'react-native'

import React, { Component } from 'react'
import platformStyles from '../styles/platform'
import StyleSheet from '../StyleSheet'

class MessageView extends Component {
  props: {
    navigator: PropTypes.object.isRequired,
    resource: PropTypes.object.isRequired,
    verification: PropTypes.object,
    // verify: PropTypes.func
  };
  constructor(props) {
    super(props);
    this.state = {
      resource: props.resource,
      isConnected: this.props.navigator.isConnected,
      promptVisible: false,
      isLoading: !props.resource[TYPE],
      bankStyle: defaultBankStyle
    };
    var currentRoutes = this.props.navigator.getCurrentRoutes();
    var len = currentRoutes.length;
    if (!currentRoutes[len - 1].onRightButtonPress  &&  currentRoutes[len - 1].rightButtonTitle) {
      if (this.props.isReview)
        currentRoutes[len - 1].onRightButtonPress = this.props.action
      else
        currentRoutes[len - 1].onRightButtonPress = this.verifyOrCreateError.bind(this)
    }
  }
  componentWillMount() {
    // if (this.props.resource.id)
    let {resource, isReview, search} = this.props
    if (isReview)
      return
    if (resource.id) {
      Actions.getItem({resource: resource, search: search})
      return
    }
    let m = utils.getModel(resource[TYPE]).value
    let vCols = m.viewCols
    if (!vCols)
      return
    let props = m.properties
    let runGetItem
    vCols.forEach((col) => {
      if (!resource[col])
        return
      let ref = props[col].ref
      if (ref  &&  ref !== MONEY  &&  utils.getModel(ref).value.subClassOf !== ENUM) {
        if (resource[col].id)
          runGetItem = true
      }
    })
    if (runGetItem)
      Actions.getItem({resource: resource, search: search})
  }

  componentDidMount() {
    this.listenTo(Store, 'onAction');
  }
  onAction(params) {
    if (params.action == 'connectivity') {
      this.setState({isConnected: params.isConnected})
      return
    }
    if (!params.resource)
      return
    if (utils.getId(params.resource) !== utils.getId(this.props.resource))
      return
    if (params.action === 'getItem') {
      let state = {
        resource: params.resource,
        isLoading: false
      }
      if (params.currency)
        state.currency = params.currency
      if (params.country)
        state.country = params.country
      if (params.style) {
        let style = {}
        if (this.props.bankStyle)
          extend(style, this.props.bankStyle)
        else
          extend(style, defaultBankStyle)
        extend(style, params.style)
        state.bankStyle = style
      }
      this.setState(state)
    }
    else if (params.action === 'exploreBacklink') {
      if (params.backlink !== this.state.backlink || params.backlinkAdded) {
        this.setState({backlink: params.backlink, backlinkList: params.list, showDetails: false, showDocuments: false})
        Actions.getItem({resource: this.props.resource})
      }
    }
    else if (params.action === 'showDetails')
      this.setState({showDetails: true, backlink: null, backlinkList: null, showDocuments: false})
    else if (params.action === 'showDocuments')
      this.setState({showDocuments: true, backlink: null, backlinkList: params.list, showDetails: false})
  }

  renderActionSheet() {
    var resource = this.state.resource;
    let m = utils.getModel(resource[TYPE]).value
    let bl = utils.getPropertiesWithAnnotation(m.properties, 'items')
    if (utils.isEmpty(bl))
      return

    let itemBl
    for (let p in bl) {
      let l = bl[p]
      if (!l.items.ref  ||  !l.items.backlink)
        continue
      let pm = utils.getModel(l.items.ref).value
      if (pm.interfaces  &&  pm.interfaces.indexOf(ITEM) !== -1) {
        itemBl = l
        break
      }
    }
    if (!itemBl)
      return
    let buttons = []
    if (itemBl.allowToAdd) {
      buttons = [
        {
          text: translate('addNew', itemBl.title),
          onPress: () => this.addNew(itemBl)
        }
      ]
    }

    buttons.push({ text: translate('cancel') })
    return (
      <ActionSheet
        ref={(o) => {
          this.ActionSheet = o
        }}
        options={buttons}
      />
    )
  }

  addNew(itemBl) {
    this.setState({hideMode: false})
    // resource if present is a container resource as for example subreddit for posts or post for comments
    // if to is passed then resources only of this container need to be returned
    let r = {};
    r[TYPE] = itemBl.items.ref
    r[itemBl.items.backlink] = { id: utils.getId(this.props.resource) }

    // if (this.props.resource.relatedTo  &&  props.relatedTo) // HACK for now for main container
    //   r.relatedTo = this.props.resource.relatedTo;
    let me = utils.getMe()
    r.from = me
    r.to = me
    r._context = this.props.resource._context
    let model = utils.getModel(r[TYPE]).value

    let self = this
    this.props.navigator.push({
      title: model.title,
      id: 4,
      component: NewResource,
      titleTextColor: '#7AAAC3',
      backButtonTitle: 'Back',
      rightButtonTitle: 'Done',
      passProps: {
        model: model,
        bankStyle: this.state.bankStyle || this.props.bankStyle,
        resource: r,
        doNotSend: true,
        defaultPropertyValues: this.props.defaultPropertyValues,
        currency: this.props.currency || this.state.currency,
        callback: (resource) => {
          self.props.navigator.pop()
        }
      }
    })
  }

  verifyOrCreateError() {
    let { resource, application } = this.props
    let model = utils.getModel(resource[TYPE]).value
    if (utils.isEmpty(this.state.errorProps)) {
      Alert.alert(
        translate('verifyPrompt'), // + utils.getDisplayName(resource),
        null,
        [
          {text: 'Cancel', onPress: () => console.log('Canceled!')},
          {text: 'Ok', onPress: this.verify.bind(this)},
        ]
      )
    }
    else {
      let properties = utils.getModel(this.state.resource[TYPE]).value.properties
      let msg = ''
      for (var p in this.state.errorProps)
        msg += msg ? ', ' + properties[p].title : properties[p].title
      msg = translate('pleaseCorrectFields', msg)
      let from = (application ? application.applicant : resource.from).title || 'Applicant'
      Alert.alert(
        translate('sendEditRequestPrompt', from),
        null,
        // msg,
        [
          {text: 'Cancel', onPress: () => console.log('Canceled!')},
          {text: 'Ok', onPress: this.createError.bind(this, msg)},
        ]
      )
   }
  }
 createError(text) {
    let errors = []
    for (let p in this.state.errorProps) {
      errors.push({name: p, error: this.state.errorProps[p] || 'Please correct this property'})
    }
    let { resource, application, navigator } = this.props
    let isReadOnlyChat = utils.isReadOnlyChat(resource)
    let context, to
    if (application) {
      to = application.applicant
      context = application._context
    }
    else {
      to = isReadOnlyChat ? resource._context : resource.from
      context = resource._context
    }
    let formError = {
      _t: 'tradle.FormError',
      errors: errors,
      prefill: resource,
      from: utils.getMe(),// resource.to,
      to: to,
      _context: context,
      message: text || translate('pleaseCorrectTheErrors')
    }
    Actions.addMessage({msg: formError, application: application})
    navigator.pop()
  }
  onCheck(prop, message) {
    let errorProps = {}

    if (this.state.errorProps)
      extend(errorProps, this.state.errorProps)
    if (this.state.errorProps  &&  this.state.errorProps[prop.name])
      delete errorProps[prop.name]
    else
      errorProps[prop.name] = message
    this.setState({errorProps: errorProps})
  }

  getRefResource(resource, prop) {
    var model = utils.getModel(this.props.resource[TYPE]).value;

    this.state.prop = prop;
    // this.state.propValue = utils.getId(resource.id);
    this.showRefResource(resource, prop)
    // Actions.getItem(resource.id);
  }

  showVerification(resource, document) {
    // Case when resource is a model. In this case the form for creating a new resource of this type will be displayed
    var model = utils.getModel(document[TYPE]).value;
    var title = model.title; //utils.getDisplayName(resource, model.properties);
    var newTitle = title;
    let me = utils.getMe()
    // Check if I am a customer or a verifier and if I already verified this resource
    let isVerifier = !resource && utils.isVerifier(document)
    let isEmployee = utils.isEmployee(this.props.resource)
    var route = {
      title: newTitle,
      id: 5,
      backButtonTitle: 'Back',
      component: MessageView,
      parentMeta: model,
      passProps: {
        bankStyle: this.state.bankStyle || this.props.bankStyle,
        resource: resource,
        currency: this.props.currency,
        document: document,
        isVerifier: isVerifier
      }
    }
    this.props.navigator.push(route);
  }
  render() {
    if (this.state.isLoading)
      return <View/>
    var resource = this.state.resource;
    var model = utils.getModel(resource[TYPE]).value;
    let isVerification = model.id === VERIFICATION
    let isVerificationTree = isVerification &&  (resource.method || resource.sources)
    let t = resource.dateVerified ? resource.dateVerified : resource.time
    var date = t ? utils.formatDate(new Date(t)) : utils.formatDate(new Date())
    var photos = resource.photos
    var mainPhoto
    if (!photos) {
      photos = utils.getResourcePhotos(model, resource)
      let mainPhotoProp = utils.getMainPhotoProperty(model)
      mainPhoto = mainPhotoProp ? resource[mainPhotoProp] : photos && photos[0]
    }
    else if (photos.length === 1)
      mainPhoto = photos[0]
    var inRow = photos ? photos.length : 0
    if (inRow  &&  inRow > 4)
      inRow = 5;

    let propertySheet
    let bankStyle = this.state.bankStyle || this.props.style
    if (isVerificationTree)
      propertySheet = <VerificationView navigator={this.props.navigator}
                                        resource={resource}
                                        bankStyle={bankStyle}
                                        currency={this.props.currency}
                                        showVerification={this.showVerification.bind(this)}/>
    let content = <View>
                    <View style={styles.photoListStyle}>
                      <PhotoList photos={photos} resource={resource} isView={true} navigator={this.props.navigator} numberInRow={inRow} />
                    </View>
                    <View style={styles.rowContainer}>
                      {msg}
                      {propertySheet}
                      {separator}
                      {verificationTxID}
                    </View>
                  </View>

    var checkProps = !isVerification && this.props.isVerifier /* && !utils.isReadOnlyChat(resource)*/ ? this.onCheck.bind(this) : null
    var actionPanel
    if (/*this.props.isReview  || */ isVerificationTree)
      actionPanel = content
    else {
      actionPanel = <ShowRefList {...this.props}
                                 backlink={this.state.backlink}
                                 resource={this.state.resource}
                                 backlinkList={this.state.backlinkList}
                                 showDetails={this.state.showDetails}
                                 showDocuments={this.state.showDocuments}
                                 errorProps={this.state.errorProps}
                                 bankStyle={bankStyle}
                                 onPageLayout={this.onPageLayout.bind(this)}
                                 showRefResource={this.getRefResource.bind(this)}
                                 defaultPropertyValues={this.props.defaultPropertyValues}
                                 checkProperties={checkProps} >
                      {content}
                    </ShowRefList>
    }
        // <FromToView resource={resource} navigator={this.props.navigator} />
        // <MoreLikeThis resource={resource} navigator={this.props.navigator}/>
    var verificationTxID, separator
    if (this.props.verification  &&  this.props.verification.txId) {
      verificationTxID =
          <View style={{padding :10, flex: 1}}>
            <Text style={styles.title}>Verification Transaction Id</Text>
            <Text style={styles.verification} onPress={this.onPress.bind(this, 'https://tbtc.blockr.io/tx/info/' + this.props.verification.txId)}>{this.props.verification.txId}</Text>
          </View>
      separator = <View style={styles.separator}></View>
    }

    let msg
    if (resource.message  &&  resource.message.length)
      msg = <View><Text style={styles.itemTitle}>{resource.message}</Text></View>

    // var isVerification = this.props.resource[TYPE] === constants.TYPES.VERIFICATION
    let dateView
    if (isVerificationTree) {
      dateView = <View style={[styles.band, {flexDirection: 'row', justifyContent: 'flex-end', borderBottomColor: bankStyle.productRowBgColor}]}>
                  <Text style={styles.dateLabel}>{translate(model.properties.dateVerified, model)}</Text>
                  <Text style={styles.dateValue}>{date}</Text>
                </View>
    }
    var actionSheet = this.renderActionSheet()
    let title = isVerification  ? this.makeViewTitle(model) : null
    let footer = actionSheet && this.renderFooter()
    let contentSeparator = utils.getContentSeparator(bankStyle)
    let bigPhoto
    if (mainPhoto)
      bigPhoto = <View style={styles.photoBG} ref='bigPhoto'>
                  <PhotoView resource={resource} mainPhoto={mainPhoto} navigator={this.props.navigator}/>
                 </View>

    return (
      <PageView style={[platformStyles.container, {height: utils.dimensions().height - 80}]} separator={contentSeparator}>
      <ScrollView
        ref='messageView'
        keyboardShouldPersistTaps="always">
        {dateView}
        {bigPhoto}
        {actionPanel}
      </ScrollView>
        {title}
        {footer}
        {actionSheet}
      </PageView>
    );
  }
  onPageLayout(height, scrollDistance) {
    let scrollTo = height + scrollDistance - NAV_BAR_CONST
    if (this.refs.bigPhoto) {
      this.refs.bigPhoto.measure((x,y,w,h,pX,pY) => {
        this.refs.messageView.scrollTo({y: scrollTo - h, animated: true})
      })
    }
    else
      this.refs.messageView.scrollTo({y: scrollTo})
  }
  makeViewTitle(model) {
    let rTitle
    let bankStyle = this.state.bankStyle || this.props.bankStyle
    if (this.props.bankStyle  &&  !this.props.bankStyle.logoNeedsText)
      rTitle = <View style={{alignSelf: 'stretch', alignItems: 'center', backgroundColor: bankStyle.navBarBackgroundColor, borderTopColor: bankStyle.contextBackgroundColor, borderTopWidth: StyleSheet.hairlineWidth, height: 45, justifyContent: 'center'}}>
                 <Text style={{fontSize: 24, color:  bankStyle.contextBackgroundColor}}>{translate(model)}</Text>
               </View>
    return rTitle
  }

  renderFooter() {
    let icon = 'md-add' //Platform.OS === 'ios' ?  'md-more' : 'md-menu'
    let color = Platform.OS === 'ios' ? '#ffffff' : 'red'
    return (
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => this.ActionSheet.show()}>
            <View style={[platformStyles.menuButton, {opacity: 0.4}]}>
              <Icon name={icon}  size={33}  color={color}/>
            </View>
          </TouchableOpacity>
        </View>
     )
  }

  onPress(url) {
    this.props.navigator.push({
      id: 7,
      component: ArticleView,
      backButtonTitle: translate('back'),
      passProps: {url: url}
    });
  }

  verify() {
    let { navigator, resource } = this.props
    navigator.pop();
    let model = utils.getModel(resource[TYPE]).value;
    let me = utils.getMe();
    let from = resource.from;
    let document = {
      id: utils.getId(resource),
      title: resource.message ? resource.message : model.title
    }
    let to = [utils.getId(from)]
    if (utils.isReadOnlyChat(resource))
      to.push(utils.getId(resource.to))
    let r = {
      [TYPE]: VERIFICATION,
      document: document,
      from: utils.getMe(),
      to: resource.to
    }
    let params = {to: to, r: r}
    if (resource._context)
      params.context = resource._context
    Actions.addVerification(params)
  }
}
reactMixin(MessageView.prototype, Reflux.ListenerMixin);
reactMixin(MessageView.prototype, ResourceMixin);

var styles = StyleSheet.create({
  itemTitle: {
    fontSize: 18,
    margin: 5,
    marginBottom: 0,
    color: '#7AAAC3'
  },
  title: {
    fontSize: 18,
    // fontFamily: 'Avenir Next',
    marginHorizontal: 7,
    color: '#9b9b9b'
  },
  verification: {
    fontSize: 18,
    marginVertical: 3,
    marginHorizontal: 7,
    color: '#7AAAC3',
  },
  separator: {
    height: 1,
    backgroundColor: '#eeeeee',
    marginHorizontal: 15
  },
  photoBG: {
    backgroundColor: '#f7f7f7',
    alignItems: 'center',
  },
  photoListStyle: {
    flexDirection: 'row',
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-end',
    height: 45,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    // borderColor: '#eeeeee',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#cccccc',
  },

  band: {
    height: 30,
    backgroundColor: '#f7f7f7',
    // borderColor:  '#f7f7f7',
    borderBottomWidth: 1,
    alignSelf: 'stretch',
    // paddingRight: 10,
    // paddingTop: 3,
    // marginTop: -10,
  },
  // rowContainer: {
  //   paddingBottom: 10,
  //   // paddingHorizontal: 10
  // },
  date: {
    fontSize: 14,
    marginTop: 5,
    marginRight: 10,
    alignSelf: 'flex-end',
    color: '#2E3B4E'
    // color: '#b4c3cb'
  },
  dateLabel: {
    fontSize: 14,
    marginTop: 5,
    marginRight: 10,
    color: '#999999'
    // color: '#b4c3cb'
  },
  dateValue: {
    fontSize: 14,
    marginTop: 5,
    marginRight: 10,
    color: '#555555'
    // color: '#b4c3cb'
  },
});

module.exports = MessageView;
