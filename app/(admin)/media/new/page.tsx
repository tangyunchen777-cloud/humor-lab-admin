import {requireAdmin} from "@/lib/admin";
import {PageTitle} from "@/components/common";
import {MediaForm} from "@/components/media-form";
export default async function NewMediaPage(){await requireAdmin();return <><PageTitle eyebrow="Media library / New caption" title="Make room for a new laugh." description="Add an AI-generated caption and keep a clear record of how it was made."/><MediaForm/></>;}
