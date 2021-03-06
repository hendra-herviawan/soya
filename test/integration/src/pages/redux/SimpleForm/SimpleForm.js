import React from 'react';
import ReduxPage from 'soya/lib/page/ReduxPage';
import RenderResult from 'soya/lib/page/RenderResult';
import ReactRenderer from 'soya/lib/page/react/ReactRenderer';
import register from 'soya/lib/client/Register';
import Form from 'soya/lib/data/redux/form/Form';
import FormSegment from 'soya/lib/data/redux/form/FormSegment';

import ContactForm from '../../../components/contextual/ContactForm/ContactForm.js'
import style from '../../../shared/sitewide.css';

const FORM_ID = 'contact';
const REUSE_FORM_ID = 'kontakte';

class Component extends React.Component {
  componentWillMount() {
    this._form = new Form(this.props.context.store, FORM_ID);
    this._kontakteForm = new Form(this.props.context.store, REUSE_FORM_ID);
    this.props.context.store.register(FormSegment);
    var storeRef = this.props.context.store.subscribe(
      FormSegment.id(),
      {type: 'fieldValue', formId: FORM_ID, fieldName: 'name'},
      (value) => {
        this.setState({name: value});
      },
      this);
    this.setState({name: storeRef.getState()});
  }

  componentWillUnmount() {
    this.props.context.store.unsubscribe(this);
  }

  setDefaultValues() {
    this._form.setDefaultValues([
      { fieldName: 'name', value: 'Default Value Rick' },
      { fieldName: 'nickname', value: 'rik' }
    ]);
  }

  render() {
    return <div>
      <h1>Simple Form</h1>
      <h3>Basic Use Cases</h3>
      <ul>
        <li>Two way data binding. Data from each field should bind to redux state, and vice-versa.</li>
        <li><a href="javascript:void(0)" onClick={this.setDefaultValues.bind(this)}>Click here</a> to set default values on name and nick name. It won't work twice, will only work on first try.</li>
        <li><a href="javascript:void(0)" onClick={this.replaceValues.bind(this)}>Click here</a> to set values to the redux store, form inputs should also update.</li>
        <li><a href="javascript:void(0)" onClick={this.clearValues.bind(this)}>Click here</a> to clear values in redux store, form inputs should also update.</li>
        <li>Sync validation should also work for each field, required/optional validation also works.</li>
        <li>Per-field submit validation should work on <i>Base City</i> (set values first, then click submit button).</li>
        <li>Async validation should also work for phone number field (value must contain 021).</li>
        <li>Form can be <a href="javascript:void(0)" onClick={this.enableForm.bind(this)}>enabled</a> and <a href="javascript:void(0)" onClick={this.disableForm.bind(this)}>disabled</a>, input fields listen to changes in enabled/disabled state.</li>
        <li>Individual fields can be <a href="javascript:void(0)" onClick={this.enableFields.bind(this)}>enabled</a> and <a href="javascript:void(0)" onClick={this.disableFields.bind(this)}>disabled</a> using the <code>Form</code> instance.</li>
        <li>Form-wide validation (acquaintance cannot borrow money) will be run on submit, only when other validation passes.</li>
        <li>On submission, all per-field sync, async and submit validation should be run, along with custom form-wide validation.</li>
      </ul>
      <h4>Name: {this.state.name}</h4>
      <ContactForm form={this._form} formName="Contact Us" context={this.props.context} />
      <h3>Reusing Form</h3>
      <ul>
        <li>Reusing the same form component, but saving it on another name.</li>
        <li>Setting values to the first form doesn't set it to the other.</li>
        <li><a href="javascript:void(0)" onClick={this.replaceKontakteForm.bind(this)}>Setting values to this form doesn't</a> set it to the first one.</li>
      </ul>
      <ContactForm form={this._kontakteForm} formName="Kontakte Form" context={this.props.context} />
    </div>
  }

  disableFields() {
    this._form.disableFields(['name', 'phoneNumber']);
  }

  enableFields() {
    this._form.enableFields(['name', 'phoneNumber']);
  }

  replaceValues() {
    this._form.setValues([
      { fieldName: 'name', value: 'Rick Christie' },
      { fieldName: 'phoneNumber', value: '123 456 789'},
      { fieldName: 'message', value: 'Bring me back that Meteora LP that you borrowed!' },
      { fieldName: 'relationship', value: 'girlfriend' },
      { fieldName: 'call', value: ['evening', 'night'] },
      { fieldName: 'from', value: 'Jayakarta (CGK)' },
      { fieldName: 'target', value: {
        sms: true,
        email: true
      }},
      { fieldName: 'type', value: 'borrowing' }
    ]);
  }

  replaceKontakteForm() {
    this._kontakteForm.setValues([
      { fieldName: 'name', value: '' },
      { fieldName: 'phoneNumber', value: '' },
      { fieldName: 'nickname', value: 'Long Winded Man' },
      { fieldName: 'message', value: '' },
      { fieldName: 'relationship', value: 'acquaintance' },
      { fieldName: 'call', value: ['morning'] },
      { fieldName: 'from', value: 'Surabaya (SUB)' },
      { fieldName: 'target', value: { email: true } },
      { fieldName: 'type', value: 'friend' }
    ]);
  }

  enableForm() {
    this._form.enable();
  }

  disableForm() {
    this._form.disable();
  }

  clearValues() {
    this._form.clearForm();
  }
}

class SimpleForm extends ReduxPage {
  static get pageName() {
    return 'SimpleForm';
  }

  render(httpRequest, routeArgs, store, callback) {
    var reactRenderer = new ReactRenderer();
    reactRenderer.head = '<title>Simple Form Test</title>';
    reactRenderer.body = React.createElement(Component, {
      context: this.createContext(store)
    });
    var renderResult = new RenderResult(reactRenderer);
    callback(renderResult);
  }
}

register(SimpleForm);
export default SimpleForm;