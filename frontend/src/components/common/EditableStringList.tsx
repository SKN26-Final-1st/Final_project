import { Button, Form, Input, Space, Tooltip } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

type EditableStringListProps = {
  addLabel: string;
  itemLabel: string;
  name: string;
  placeholder: string;
};

export function EditableStringList({ addLabel, itemLabel, name, placeholder }: EditableStringListProps) {
  return (
    <Form.List name={name}>
      {(fields, { add, remove }) => (
        <Space orientation="vertical" size={8} className="editable-string-list">
          {fields.map((field, index) => {
            const { key, ...fieldProps } = field;

            return (
              <Space.Compact key={key} block className="editable-string-list-row">
                <Form.Item {...fieldProps} noStyle>
                  <Input aria-label={`${itemLabel} ${index + 1}`} placeholder={placeholder} />
                </Form.Item>
                <Tooltip title="삭제">
                  <Button
                    danger
                    aria-label={`${itemLabel} ${index + 1} 삭제`}
                    icon={<DeleteOutlined />}
                    onClick={() => remove(field.name)}
                  />
                </Tooltip>
              </Space.Compact>
            );
          })}
          <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add('')}>
            {addLabel}
          </Button>
        </Space>
      )}
    </Form.List>
  );
}
