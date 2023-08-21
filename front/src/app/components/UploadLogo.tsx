import * as React from "react";
import { AbsoluteUrl } from "shared";
import { domElementIds } from "shared";
import { File } from "react-design-system";
import { technicalGateway } from "src/config/dependencies";

interface UploadLogoProps {
  label: string;
  hint?: React.ReactNode;
  maxSize_Mo: number;
  setFileUrl: (fileUrl: AbsoluteUrl) => void;
}

export const UploadLogo = ({
  maxSize_Mo,
  setFileUrl,
  label,
  hint,
}: UploadLogoProps) => {
  const [error, setError] = React.useState<string>();
  return (
    <File
      onChange={async (e) => {
        let file = null;
        if (e.target.files?.length) {
          file = e.target.files[0];
        }
        if (file && file.size > 1_000_000 * maxSize_Mo) {
          setError(`Le fichier ne peut pas faire plus de ${maxSize_Mo} Mo`);
          return;
        } else {
          setError(undefined);
        }
        if (!file) return;

        const fileUrl = await technicalGateway.uploadLogo(file);
        setFileUrl(fileUrl);
      }}
      label={label}
      hint={hint}
      errorMessage={error}
      id={domElementIds.addAgency.uploadLogoInput}
    />
  );
};
