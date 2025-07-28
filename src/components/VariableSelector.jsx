function VariableSelector({ availableVariables, selectedVariableId, onVariableChange }) {
  const handleChange = (event) => {
    onVariableChange(event.target.value);
  };

  return (
    <div className="variable-selector">
      <label htmlFor="variable-select">
        🔍 Select Variable to Display:
      </label>
      <select 
        id="variable-select"
        value={selectedVariableId} 
        onChange={handleChange}
        className="variable-select"
      >
        {availableVariables.map((variable) => (
          <option key={variable.id} value={variable.id}>
            {variable.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default VariableSelector;
