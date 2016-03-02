import React from 'react';

import { isEqualShallow } from '../helper.js';
import PromiseUtil from '../PromiseUtil.js';
import FormSegment from './FormSegment.js';
import connect from '../connect.js';

/**
 * Wraps the given InputComponent in a component that links to FormSegment with
 * the following contract:
 *
 * 1) InputComponent must get value from props.value when rendering.
 * 2) InputComponent must run props.handleChange when the value changes.
 * 3) InputComponent may run props.handleAsyncChange if it wants to be able to
 *    run async validation and async change handlers.
 *
 * Accepts the following special props:
 *
 * 1) reduxStore
 * 2) config
 * 3) changeHandlers (array of functions, optional)
 * 4) changeValidators (array of functions, optional)
 * 5) asyncValidators (array of functions, optional)
 * 6) submitValidators (array of functions, optional)
 *
 * Any other props will be passed on to the wrapped input component untouched.
 *
 * @param {React.Component} InputComponent
 * @return {ReactComponent}
 */
export default function createField(InputComponent) {
  var type = typeof InputComponent.getQueryType == 'function' ? InputComponent.getQueryType() : 'field';

  // TODO: Move these methods into separate functions above, so that they are reused instead of always recreated.
  class Component extends React.Component {
    __handleChange;
    __handleAsyncValidation;
    __inputChangeValidators;
    __inputAsyncValidators;
    __submitValidators;
    __registerChangeValidators;
    __registerAsyncValidators;
    __registerSubmitValidators;

    static connectId() {
      return InputComponent.connectId ? InputComponent.connectId() : 'Field Component';
    }

    static getSegmentDependencies() {
      return [FormSegment];
    }

    static subscribeQueries(nextProps, subscribe) {
      subscribe(FormSegment.id(), {
        formId: nextProps.form._formId,
        type: type,
        fieldName: nextProps.name
      }, 'field');
    }

    constructor(props, context) {
      super(props, context);
      this.__inputChangeValidators = [];
      this.__inputAsyncValidators = [];
      this.__submitValidators = [];
      this.__handleChange = this.handleChange.bind(this);
      this.__handleAsyncValidation = this.handleAsyncValidation.bind(this);
      this.__registerAsyncValidators = this.registerAsyncValidators.bind(this);
      this.__registerChangeValidators = this.registerChangeValidators.bind(this);
      this.__registerSubmitValidators = this.registerSubmitValidators.bind(this);
    }

    componentWillMount() {
      this.props.form.regField(
        this.props.name, this.handleValidateAll.bind(this));
    }

    shouldComponentUpdate(nextProps, nextState) {
      // We don't use state, so we don't have to check it. But we do have to
      // check for props.
      return !isEqualShallow(nextProps, this.props);
    }

    render() {
      // Pass appropriate props to the InputComponent.
      var key, props = {};
      for (key in this.props) {
        if (!this.props.hasOwnProperty(key)) continue;
        if (key == 'result' || key == 'changeHandlers' || key == 'validators' || key == 'validatorsAsync') continue;
        props[key] = this.props[key];
      }

      if (this.props.result.field) {
        props.value = this.props.result.field.value;
        props.errorMessages = this.props.result.field.errorMessages;
        props.touched = this.props.result.field.touched;
        props.isValidating = this.props.result.field.isValidating;
      } else {
        props.value = null;
        props.errorMessages = [];
        props.touched = false;
        props.isValidating = false;
      }

      props.handleChange = this.__handleChange;
      props.handleAsyncValidation = this.__handleAsyncValidation;
      props.registerChangeValidators = this.__registerChangeValidators;
      props.registerAsyncValidators = this.__registerAsyncValidators;
      props.registerSubmitValidators = this.__registerSubmitValidators;

      // For performance optimizations, InputComponent may implement
      // shouldComponentUpdate that checks for changes in props.
      return <InputComponent key="main" {...props} />;
    }

    /**
     * @param {Array<Function>} funcArray
     */
    registerChangeValidators(funcArray) {
      this.__inputChangeValidators = this.__inputChangeValidators.concat(funcArray);
    }

    /**
     * @param {Array<Function>} funcArray
     */
    registerAsyncValidators(funcArray) {
      this.__inputAsyncValidators = this.__inputAsyncValidators.concat(funcArray);
    }

    /**
     * @param {Array<Function>} funcArray
     */
    registerSubmitValidators(funcArray) {
      this.__submitValidators = this.__submitValidators.concat(funcArray);
    }

    /**
     * @param {?} value
     */
    handleChange(value) {
      var i, errorMessages = this.validateSync(value);
      var actions = this.props.getActionCreator(FormSegment.id());
      if (errorMessages.length == 0) {
        this.props.getReduxStore().dispatch(actions.setValue(
          this.props.form._formId, this.props.name, value
        ));
      } else {
        this.props.getReduxStore().dispatch(actions.mergeFields(
          this.props.form._formId, {
            [this.props.name]: {
              value: value,
              touched: true,
              errorMessages: errorMessages
            }
          })
        );
      }

      // After dispatching (and closing the loop). Run the change handlers.
      if (this.props.changeHandlers) {
        for (i = 0; i < this.props.changeHandlers.length; i++) {
          this.props.changeHandlers[i](value);
        }
      }
    }

    /**
     * Runs all sync and async validators. Returns a promise that resolves to
     * true if the value passes validation, it resolves to false otherwise.
     * The promise should reject if there's an error with async validation.
     *
     * @returns {Promise}
     */
    handleValidateAll() {
      var value = this.props.result.field ? this.props.result.field.value : null;
      var errorMessages = this.validateSync(value);
      if (errorMessages.length > 0) {
        var actions = this.props.getActionCreator(FormSegment.id());
        this.props.reduxStore.dispatch(actions.mergeFields(
          this.props.form._formId, {
            [this.props.name]: {
              errorMessages: errorMessages
            }
          }
        ));
        return Promise.resolve(false);
      }

      var asyncPromise, submitPromise;
      var hasAsyncValidation = this.hasAsyncValidation();
      var hasSubmitValidation = this.hasSubmitValidation();

      if (!hasAsyncValidation && !hasSubmitValidation) {
        return Promise.resolve(true);
      }



      if (!hasAsyncValidation) {
        asyncPromise = Promise.resolve(true);
      } else {
        asyncPromise = this.validateAsync();
      }

      if (!hasSubmitValidation) {
        submitPromise = Promise.resolve(true);
      } else {
        submitPromise = this.validateSubmit();
      }

      return PromiseUtil.allParallel(Promise, [asyncPromise, submitPromise]).then(
        function(results) {
          var i, result = true;
          for (i = 0; i < results.length; i++) {
            result = result && results[i];
          }
          return result;
        },
        function(error) {
          console.log('Unable to run submit validation.', error);
          return false;
        }
      );
    }

    /**
     * This handler doesn't update value - we assume that handleChange
     * is already run and thus value in FormSegment is already updated. It's
     * a trigger for asynchronous validation. We assume that:
     *
     * - Asynchronous validation must trigger on a less often triggered event,
     *   like onBlur or a predetermined timeout.
     * - The input component will read isValidating value and appropriately
     *   disables the input when the asynchronous validation is running to
     *   prevent lagging async validation to happen.
     *
     * Returns a promise that resolves to true if the value passes validation,
     * or false if not.
     *
     * @return {?Promise}
     */
    handleAsyncValidation() {
      var value = this.props.result.field ? this.props.result.field.value : null;
      var errorMessages = this.validateSync(value);
      if (errorMessages.length > 0) {
        // No need to continue if sync validation has failed.
        return Promise.resolve(false);
      }

      // No need to run if we have no async validation.
      var hasAsyncValidation = this.hasAsyncValidation();
      if (!hasAsyncValidation) {
        return Promise.resolve(true);
      }

      this.lock();
      var promise = this.validateAsync(value);
      promise.then(this.unlock.bind(this)).catch(this.unlock.bind(this));
      return promise;
    }

    /**
     * Returns a promise that resolves to true if value passes validation, or
     * false if not.
     *
     * @param {?} value
     * @returns {Promise}
     */
    validateAsync(value) {
      var i, promises = [];
      for (i = 0; i < this.__inputAsyncValidators.length; i++) {
        promises.push(this.__inputAsyncValidators[i](value));
      }
      if (this.props.asyncValidators) {
        for (i = 0; i < this.props.asyncValidators; i++) {
          promises.push(this.props.asyncValidators[i](value));
        }
      }

      var parallelPromise = PromiseUtil.allParallel(Promise, promises);
      var finalPromise = new Promise(function(resolve, reject) {
        parallelPromise.then(
          (result) => {
            var i, errorMessages = [];
            for (i = 0; i < result.length; i++) {
              if (typeof result[i] == 'string') errorMessages.push(result[i]);
            }
            this.props.reduxStore.dispatch(actions.mergeFields(
              this.props.form._formId, {
                [this.props.name]: {
                  isValidating: false,
                  errorMessages: errorMessages
                }
              }
            ));
            resolve(errorMessages.length <= 0);
          },
          (error) => {
            reject(error);
          });
      });
      return finalPromise;
    }

    /**
     * Runs input and props sync validators on the value and returns the error
     * messages.
     *
     * @param {?} value
     * @return {Array<string>}
     */
    validateSync(value) {
      // Run validation, run user validation first since it may contain the
      // required or optional validator.
      var i, result, errorMessages = [];
      if (this.props.changeValidators) {
        for (i = 0; i < this.props.changeValidators.length; i++) {
          result = this.props.changeValidators[i](value);
          if (!this.pushErrorMessage(result, errorMessages)) return errorMessages;
        }
      }
      for (i = 0; i < this.__inputChangeValidators.length; i++) {
        result = this.__inputChangeValidators[i](value);
        if (!this.pushErrorMessage(result, errorMessages)) return errorMessages;
      }
      return errorMessages;
    }

    validateSubmit(value) {

    }

    /**
     * @returns {boolean}
     */
    hasAsyncValidation() {
      return (
        this.__inputAsyncValidators.length > 0 ||
        (this.props.asyncValidators && this.props.asyncValidators.length > 0)
      );
    }

    /**
     * @return {boolean}
     */
    hasSubmitValidation() {
      return (
        this.__submitValidators.length > 0 ||
        (this.props.submitValidators && this.props.submitValidators.length > 0)
      );
    }

    /**
     * Locks this field by setting its isValidating flag to true.
     */
    lock() {
      var actions = this.props.getActionCreator(FormSegment.id());
      this.props.reduxStore.dispatch(actions.setIsValidating(
        this.props.form._formId, { [this.props.name] : true }
      ));
    }

    /**
     * Unlock this field by setting its isValidating flag to false.
     */
    unlock() {
      var actions = this.props.getActionCreator(FormSegment.id());
      this.props.reduxStore.dispatch(actions.setIsValidating(
        this.props.form._formId, { [this.props.name]: false }
      ));
    }

    /**
     * Returns true if next validator function should be called. Returns false
     * otherwise.
     *
     * @param {string|boolean} result
     * @param {Array<string>} errorMessages
     * @return {boolean}
     */
    pushErrorMessage(result, errorMessages) {
      if (result === null) return false;
      if (typeof result == 'string') errorMessages.push(result);
      return true;
    }
  }

  return connect(Component);
}