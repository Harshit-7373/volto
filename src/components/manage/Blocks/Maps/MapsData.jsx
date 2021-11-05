import React from 'react';
import { MapsSchema } from './schema';
import { BlockDataForm } from '@plone/volto/components';
import { useIntl, defineMessages } from 'react-intl';
import globeSVG from '@plone/volto/icons/globe.svg';
import { Icon } from '@plone/volto/components';
import { Segment } from 'semantic-ui-react';

const messages = defineMessages({
  Maps: {
    id: 'Maps',
    defaultMessage: 'Maps',
  },
  NoMaps: {
    id: 'No map selected',
    defaultMessage: 'No map selected',
  },
});

const MapsData = (props) => {
  const { data, block, onChangeBlock, schemaEnhancer } = props;
  const intl = useIntl();
  const schema = schemaEnhancer
    ? schemaEnhancer(MapsSchema({ ...props, intl }), props)
    : MapsSchema({ ...props, intl });

  return (
    <>
      {!data.url ? (
        <Segment className="sidebar-metadata-container" secondary>
          {props.intl.formatMessage(messages.NoMaps)}
          <Icon name={globeSVG} size="100px" color="#b8c6c8" />
        </Segment>
      ) : (
        <BlockDataForm
          schema={schema}
          title={intl.formatMessage(messages.Maps)}
          onChangeField={(id, value) => {
            onChangeBlock(block, {
              ...data,
              [id]: value,
            });
          }}
          formData={data}
          fieldIndex={data.index}
          block={block}
        />
      )}
    </>
  );
};

export default MapsData;
