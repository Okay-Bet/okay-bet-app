// components/CreateBetForm/ConditionsInput.tsx
import React, { ChangeEvent } from "react";

interface ConditionsInputProps {
  conditions: string;
  setConditions: (value: string) => void;
}

const ConditionsInput: React.FC<ConditionsInputProps> = ({ conditions, setConditions }) => {
  return (
    <div>
      <label htmlFor="conditions" className="block mb-2 font-heading text-xl">
        Conditions
      </label>
      <textarea
        id="conditions"
        value={conditions}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
          setConditions(e.target.value)
        }
        required
        className="w-full p-2 border text-black text-lg"
        rows={4}
        placeholder="Describe the conditions of the bet"
      />
    </div>
  );
};

export default ConditionsInput;
