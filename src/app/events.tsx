import useWebSocket from '../hooks/useWebSocket';

const ContractEvents = () => {
  const { isConnected, lastEvent } = useWebSocket();

  return (
    <div>
      <h2>Contract Events</h2>
      <p>WebSocket status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {lastEvent && (
        <div>
          <h3>Last Event:</h3>
          <p>Type: {lastEvent.type}</p>
          <p>Data: {JSON.stringify(lastEvent.data)}</p>
        </div>
      )}
    </div>
  );
};

export default ContractEvents;