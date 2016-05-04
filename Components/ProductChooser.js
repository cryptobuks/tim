'use strict';

var React = require('react-native');
var NewResource = require('./NewResource');
var utils = require('../utils/utils');
var translate = utils.translate
var reactMixin = require('react-mixin');
var Store = require('../Store/Store');
var Actions = require('../Actions/Actions');
var Reflux = require('reflux');
var constants = require('@tradle/constants');
var MessageList = require('./MessageList')
const PRODUCT_APPLICATION = 'tradle.ProductApplication'
var {
  ListView,
  Text,
  Component,
  StyleSheet,
  View,
} = React;

class ProductChooser extends Component {
  constructor(props) {
    super(props);

    var products = []
    var orgProducts = this.props.resource.products
    if (orgProducts) {
      orgProducts.forEach(function(m) {
        products.push(utils.getModel(m).value)
      })

    }
    else {
      var productList = utils.getAllSubclasses(constants.TYPES.FINANCIAL_PRODUCT);
      productList.forEach(function(m) {
        if (m.forms)
          products.push(m)
      })
    }

    var dataSource =  new ListView.DataSource({
      rowHasChanged: (row1, row2) => row1 !== row2,
    });
    this.state = {
      products: products,
      modelName: constants.TYPES.FINANCIAL_PRODUCT,
      dataSource: dataSource.cloneWithRows(products),
    };
  }
  componentWillMount() {
    Actions.getItem(this.props.resource[constants.TYPE] + '_' + this.props.resource[constants.ROOT_HASH])
  }
  componentDidMount() {
    this.listenTo(Store, 'onNewProductAdded');
  }
  onNewProductAdded(params) {
    if (params.action === 'getItem'  &&  this.props.resource[constants.ROOT_HASH] === params.resource[constants.ROOT_HASH]) {
      var products = []
      params.resource.products.forEach(function(m) {
        products.push(utils.getModel(m).value)
      })
      this.setState({
        products: products,
        dataSource: this.state.dataSource.cloneWithRows(products),
      })
      return
    }
    if (params.action !== 'productList' || params.resource[constants.ROOT_HASH] !== this.props.resource[constants.ROOT_HASH])
      return;
    if (params.err) {
      this.setState({err: params.err});
      return
    }
    var products = params.productList;

    this.setState({
      products: products,
      dataSource: this.state.dataSource.cloneWithRows(products),
    });
  }

  selectResource(resource) {
    var route = {
      component: MessageList,
      backButtonTitle: translate('cancel'),
      id: 11,
      title: this.props.resource.name,
      passProps: {
        resource: this.props.resource,
        filter: '',
        modelName: constants.TYPES.MESSAGE,
      },
    }
    var msg = {
      product: resource.id, // '[application for](' + resource.id + ')',
      _t:      PRODUCT_APPLICATION, // constants.TYPES.SIMPLE_MESSAGE,
      from:    utils.getMe(),
      to:      this.props.resource,
      time:    new Date().getTime()
    }

    utils.onNextTransitionEnd(this.props.navigator, () => Actions.addMessage(msg, true, true))
    this.props.navigator.pop();

  }
  selectResource1(resource) {
    // Case when resource is a model. In this case the form for creating a new resource of this type will be displayed
    var model = utils.getModel(this.state.modelName);

    if (resource[constants.TYPE])
      return;
    var page = {
      model: utils.getModel(resource.id).value,
    }
    if (this.props.returnRoute)
      page.returnRoute = this.props.returnRoute;
    if (this.props.callback)
      page.callback = this.props.callback;
    var me = utils.getMe()
    page.resource = {
      _t: resource.id,
      from: me,
      accountWith: this.props.resource,
      productType: model.value.title
    }
    this.props.navigator.replace({
      id: 4,
      title: resource.title,
      rightButtonTitle: translate('done'),
      backButtonTitle: translate('back'),
      component: NewResource,
      titleTextColor: '#7AAAC3',
      resource: resource,
      passProps: page
    });
  }
  renderRow(resource)  {
    var model = utils.getModel(resource[constants.TYPE] || resource.id).value;
    var MessageTypeRow = require('./MessageTypeRow');

    return (
      <MessageTypeRow
        onSelect={() => this.selectResource(resource)}
        resource={resource}
        to={this.props.to}
        bankStyle={this.props.bankStyle}
        navigator={this.props.navigator}
        to={this.props.resource} />
      );
  }
  render() {
    var content =
    <ListView ref='listview' style={styles.listview}
      dataSource={this.state.dataSource}
      renderRow={this.renderRow.bind(this)}
      automaticallyAdjustContentInsets={false}
      keyboardDismissMode='on-drag'
      keyboardShouldPersistTaps={true}
      showsVerticalScrollIndicator={false} />;

    var err = this.state.err
            ? <View style={styles.errContainer}><Text style={styles.err}>{this.state.err}</Text></View>
            : <View />;
    var bgStyle = this.props.bankStyle  &&  this.props.bankStyle.BACKGROUND_COLOR ? {backgroundColor: this.props.bankStyle.BACKGROUND_COLOR} : {backgroundColor: '#ffffff'}
    return (
      <View style={[styles.container, bgStyle]}>
        {err}
        {content}
      </View>
    );
  }
}
reactMixin(ProductChooser.prototype, Reflux.ListenerMixin);

var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  listview: {
    marginTop: 64,
  },
  centerText: {
    alignItems: 'center',
  },
  err: {
    color: '#D7E6ED'
  },
  errContainer: {
    height: 45,
    paddingTop: 5,
    paddingHorizontal: 10,
    backgroundColor: '#eeeeee',
  }
});

module.exports = ProductChooser;
