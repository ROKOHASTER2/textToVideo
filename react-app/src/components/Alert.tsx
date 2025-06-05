import React, { ReactNode } from 'react'
interface Props {
    children:ReactNode;
    onClick: () => void;
}
const Alert = ({children, onClick}:Props,) => {
  return (
    <button type="button" className="btn btn-primary" onClick={onClick}>{children}</button>
  )
}

export default Alert