import { useState } from 'react';
import { Button, Form, Space, Tag, type FormInstance } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { toTrimmedStringList } from '../../utils/stringList';
import { EditableStringList } from './EditableStringList';

type CollapsibleEditableStringListFieldProps = {
  addLabel: string;
  emptyText: string;
  form: FormInstance;
  itemLabel: string;
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  summaryLimit?: number;
};

export function CollapsibleEditableStringListField({
  addLabel,
  emptyText,
  form,
  itemLabel,
  label,
  name,
  placeholder,
  required = false,
  summaryLimit = 3,
}: CollapsibleEditableStringListFieldProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const watchedValue = Form.useWatch(name, form);
  const summary = toTrimmedStringList(watchedValue ?? form.getFieldValue(name));
  const visibleSummary = summary.slice(0, summaryLimit);
  const hiddenCount = Math.max(summary.length - visibleSummary.length, 0);

  return (
    <Form.Item shouldUpdate noStyle>
      {() => {
        const errors = form.getFieldError(name);

        return (
          <Form.Item label={label} required={required} validateStatus={errors.length ? 'error' : undefined} help={errors[0]}>
            <div className="collapsible-editable-list-field">
              <div className="collapsible-editable-list-summary">
                <div className="collapsible-editable-list-tags">
                  {visibleSummary.length ? (
                    <>
                      {visibleSummary.map((item, index) => (
                        <Tag key={`${item}-${index}`}>{item}</Tag>
                      ))}
                      {hiddenCount ? <Tag>+{hiddenCount}</Tag> : null}
                    </>
                  ) : (
                    <span className="muted">{emptyText}</span>
                  )}
                </div>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  aria-expanded={isEditorOpen}
                  onClick={() => setIsEditorOpen((current) => !current)}
                >
                  {isEditorOpen ? '편집 닫기' : `${label} 편집`}
                </Button>
              </div>
              <Space
                orientation="vertical"
                size={8}
                className="collapsible-editable-list-editor"
                hidden={!isEditorOpen}
                aria-hidden={!isEditorOpen}
              >
                <EditableStringList name={name} itemLabel={itemLabel} placeholder={placeholder} addLabel={addLabel} />
              </Space>
            </div>
          </Form.Item>
        );
      }}
    </Form.Item>
  );
}
