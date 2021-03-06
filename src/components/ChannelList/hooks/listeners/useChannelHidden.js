import { useContext, useEffect } from 'react';

import { ChatContext } from '../../../../context';

export const useChannelHidden = ({ onChannelHidden, setChannels }) => {
  const { client } = useContext(ChatContext);

  useEffect(() => {
    const handleEvent = (e) => {
      if (typeof onChannelHidden === 'function') {
        onChannelHidden(setChannels, e);
      } else {
        setChannels((channels) => {
          const index = channels.findIndex(
            (c) => c.cid === (e.cid || e.channel?.cid),
          );
          if (index >= 0) {
            channels.splice(index, 1);
          }
          return [...channels];
        });
      }
    };

    client.on('channel.hidden', handleEvent);
    return () => client.off('channel.hidden', handleEvent);
  }, []);
};
