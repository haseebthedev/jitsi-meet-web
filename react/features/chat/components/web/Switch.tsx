import React, { useEffect, useState } from 'react';
import { makeStyles } from 'tss-react/mui';

interface IProps {

  /**
   * Callback to invoke when a smiley is selected. The smiley will be passed
   * back.
   */
  isChecked: boolean;
  onChange: (value: boolean) => void
}

const useStyles = makeStyles()(theme => ({
    switchContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    switch: {
        position: 'relative',
        width: '50px',
        height: '28px',
        backgroundColor: '#ccc',
        borderRadius: '34px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        '&:before': {
        content: '""',
        position: 'absolute',
        width: '22px',
        height: '22px',
        backgroundColor: '#fff',
        borderRadius: '50%',
        top: '3px',
        left: '3px',
        transition: 'transform 0.3s ease',
        }
    },
    switchOn: {
        backgroundColor: '#4cd964', // iOS green for active state
        '&:before': {
        transform: 'translateX(22px)', // Shift to the right when active
        }
    }
}));  

const Switch = ({ isChecked = false, onChange }: IProps) => {
    const { classes, cx } = useStyles();
  
    // Use internal state for controlling checked status
    const [checked, setChecked] = useState(isChecked);
  
    // Handle the click and pass new state via onChange
    const handleClick = () => {
      const newCheckedState = !checked;
      setChecked(newCheckedState);
      if (onChange) {
        onChange(newCheckedState); // Trigger onChange with updated value
      }
    };
  
    // Sync internal state with external prop updates
    useEffect(() => {
      setChecked(isChecked);
    }, [isChecked]);
  
    return (
      <div className={classes.switchContainer}>
        <div
          className={cx(classes.switch, { [classes.switchOn]: checked })} // Use `checked` state
          onClick={handleClick}
          role="switch"
          aria-checked={checked} // Update aria to reflect the state
          aria-label="iOS style switch"
          data-value={"_isChatEnabled"} // Optional value prop
        />
      </div>
    );
  };

export default Switch;
