/**
 * App container.
 * @module components/theme/App/App
 */

import React, { Component } from 'react';
import jwtDecode from 'jwt-decode';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { asyncConnect, Helmet } from '@plone/volto/helpers';
import { Segment } from 'semantic-ui-react';
import { renderRoutes } from 'react-router-config';
import { Slide, ToastContainer, toast } from 'react-toastify';
import split from 'lodash/split';
import join from 'lodash/join';
import trim from 'lodash/trim';
import cx from 'classnames';
import config from '@plone/volto/registry';
import { PluggablesProvider } from '@plone/volto/components/manage/Pluggable';
import { visitBlocks } from '@plone/volto/helpers/Blocks/Blocks';
import { injectIntl } from 'react-intl';
import withQuery from '../../../queries/withQuery';

import Error from '@plone/volto/error';

import {
  Breadcrumbs,
  Footer,
  Header,
  Icon,
  OutdatedBrowser,
  AppExtras,
  SkipLinks,
} from '@plone/volto/components';
import {
  BodyClass,
  getBaseUrl,
  getView,
  hasApiExpander,
  isCmsUi,
} from '@plone/volto/helpers';
import {
  getBreadcrumbs,
  getContent,
  getNavigation,
  getTypes,
  getWorkflow,
} from '@plone/volto/actions';

import clearSVG from '@plone/volto/icons/clear.svg';
import MultilingualRedirector from '@plone/volto/components/theme/MultilingualRedirector/MultilingualRedirector';
import WorkingCopyToastsFactory from '@plone/volto/components/manage/WorkingCopyToastsFactory/WorkingCopyToastsFactory';
import LockingToastsFactory from '@plone/volto/components/manage/LockingToastsFactory/LockingToastsFactory';

/**
 * @export
 * @class App
 * @extends {Component}
 */
class App extends Component {
  /**
   * Property types.
   * @property {Object} propTypes Property types.
   * @static
   */
  static propTypes = {
    pathname: PropTypes.string.isRequired,
  };

  state = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  constructor(props) {
    super(props);
    this.mainRef = React.createRef();
  }

  /**
   * @method componentWillReceiveProps
   * @param {Object} nextProps Next properties
   * @returns {undefined}
   */
  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.pathname !== this.props.pathname) {
      if (this.state.hasError) {
        this.setState({ hasError: false });
      }
    }
  }

  /**
   * ComponentDidCatch
   * @method ComponentDidCatch
   * @param {string} error  The error
   * @param {string} info The info
   * @returns {undefined}
   */
  componentDidCatch(error, info) {
    this.setState({ hasError: true, error, errorInfo: info });
    config.settings.errorHandlers.forEach((handler) => handler(error));
  }

  dispatchContentClick = (event) => {
    if (event.target === event.currentTarget) {
      const rect = this.mainRef.current.getBoundingClientRect();
      if (event.clientY > rect.bottom) {
        document.dispatchEvent(new Event('voltoClickBelowContent'));
      }
    }
  };

  /**
   * Render method.
   * @method render
   * @returns {string} Markup for the component.
   */
  render() {
    const { views } = config;
    const { content, intl, pathname, token } = this.props;
    const path = getBaseUrl(pathname);
    const action = getView(pathname);
    const isCmsUI = isCmsUi(pathname);
    const ConnectionRefusedView = views.errorViews.ECONNREFUSED;

    const language = content?.language?.token ?? intl?.locale;

    return (
      <PluggablesProvider>
        {language && (
          <Helmet>
            <html lang={language} />
          </Helmet>
        )}
        <BodyClass className={`view-${action}view`} />

        {/* Body class depending on content type */}
        {content?.['@type'] && (
          <BodyClass
            className={`contenttype-${content['@type']
              .replace(' ', '-')
              .toLowerCase()}`}
          />
        )}

        {/* Body class depending on sections */}
        <BodyClass
          className={cx({
            [trim(join(split(pathname, '/'), ' section-'))]: pathname !== '/',
            siteroot: pathname === '/',
            'is-authenticated': !!token,
            'is-anonymous': !token,
            'cms-ui': isCmsUI,
            'public-ui': !isCmsUI,
          })}
        />
        <SkipLinks />
        <Header pathname={path} />
        <Breadcrumbs pathname={path} />
        <MultilingualRedirector
          pathname={pathname}
          contentLanguage={content?.language?.token}
        >
          <Segment
            basic
            className="content-area"
            onClick={this.dispatchContentClick}
          >
            <main ref={this.mainRef}>
              <OutdatedBrowser />
              {this.props.connectionRefused ? (
                <ConnectionRefusedView />
              ) : this.state.hasError ? (
                <Error
                  message={this.state.error.message}
                  stackTrace={this.state.errorInfo.componentStack}
                />
              ) : (
                // TODO: static context for better error handling
                renderRoutes(this.props.route.routes, {
                  staticContext: this.props.staticContext,
                })
              )}
            </main>
          </Segment>
        </MultilingualRedirector>
        <Footer />
        <LockingToastsFactory content={content} user={this.props.userId} />
        <WorkingCopyToastsFactory content={content} />
        <ToastContainer
          position={toast.POSITION.BOTTOM_CENTER}
          hideProgressBar
          transition={Slide}
          autoClose={5000}
          closeButton={
            <Icon
              className="toast-dismiss-action"
              name={clearSVG}
              size="18px"
            />
          }
        />
        <AppExtras {...this.props} />
      </PluggablesProvider>
    );
  }
}

export const __test__ = connect(
  (state, props) => ({
    pathname: props.location.pathname,
    token: state.userSession.token,
    content: state.content.data,
    apiError: state.apierror.error,
    connectionRefused: state.apierror.connectionRefused,
  }),
  {},
)(App);

export const fetchContent = async ({ store, location }) => {
  const content = await store.dispatch(
    getContent(getBaseUrl(location.pathname)),
  );

  const promises = [];
  const { blocksConfig } = config.blocks;

  const visitor = ([id, data]) => {
    const blockType = data['@type'];
    const { getAsyncData } = blocksConfig[blockType];
    if (getAsyncData) {
      const p = getAsyncData({
        store,
        dispatch: store.dispatch,
        path: location.pathname,
        location,
        id,
        data,
        blocksConfig,
      });
      if (!p?.length) {
        throw new Error(
          'You should return a list of promises from getAsyncData',
        );
      }
      promises.push(...p);
    }
  };

  visitBlocks(content, visitor);

  await Promise.allSettled(promises);

  return content;
};

export default compose(
  injectIntl,
  connect(
    (state, props) => ({
      token: state.userSession.token,
      userId: state.userSession.token
        ? jwtDecode(state.userSession.token).sub
        : '',
      apiError: state.apierror.error,
      connectionRefused: state.apierror.connectionRefused,
    }),
    null,
  ),
  withQuery,
)(App);
